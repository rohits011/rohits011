#!/usr/bin/env python3
"""Validate chapters and regenerate the full-text search index.

Usage:
    python3 tools/build.py                 # validate all chapters, rebuild index
    python3 tools/build.py chapters/x.html # validate specific files only (no index rebuild)

No third-party dependencies. The generated assets/js/search-index.js is committed,
so readers never need to run this script.
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHAPTERS = ROOT / "chapters"
TOC_JS = ROOT / "assets" / "js" / "toc.js"
INDEX_JS = ROOT / "assets" / "js" / "search-index.js"

REQUIRED_SECTIONS = [
    "introduction", "history", "fundamentals", "internals", "architecture", "math",
    "code", "applications", "case-studies", "tradeoffs-limits", "tradeoffs", "mistakes",
    "production", "exercises", "interview", "knowledge-check", "further-reading",
]
# Front-matter pages that do not follow the 17-section chapter template.
FREEFORM = {"roadmap", "references"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SKIP_TEXT = {"script", "style"}


def toc_ids() -> list[str]:
    return re.findall(r'\bid:\s*"([^"]+)"', TOC_JS.read_text(encoding="utf-8"))


class ChapterParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.errors: list[str] = []
        self.body_chapter: str | None = None
        self.title = ""
        self.h1 = ""
        self.sections: list[str] = []
        self.section_text: dict[str, list[str]] = {}
        self.section_heading: dict[str, str] = {}
        self.current_section: str | None = None
        self.stack: list[str] = []
        self.in_code = 0
        self.in_mermaid = 0
        self.in_title = False
        self.in_h1 = False
        self.in_h2 = False
        self.skip = 0
        self.has_bridge = False
        self.quizzes: list[dict] = []
        self.ref_links = 0
        self.mermaid_count = 0
        self.widget_count = 0
        self.words = 0
        self._quiz: dict | None = None

    # -- helpers
    def _loc(self) -> str:
        return f"line {self.getpos()[0]}"

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = (a.get("class") or "").split()
        if self.in_code and tag not in ("span",):
            self.errors.append(f"{self._loc()}: <{tag}> inside <code> — unescaped '<'? Use &lt;")
        if self.in_mermaid:
            self.errors.append(f"{self._loc()}: <{tag}> inside mermaid block — escape or remove it")
        if tag == "body":
            self.body_chapter = a.get("data-chapter")
        elif tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.in_h1 = True
        elif tag == "h2" and self.current_section:
            self.in_h2 = True
            self.section_heading[self.current_section] = ""
        elif tag == "section" and a.get("id"):
            self.current_section = a["id"]
            self.sections.append(a["id"])
            self.section_text.setdefault(a["id"], [])
        elif tag == "code":
            self.in_code += 1
        elif tag == "pre" and "mermaid" in cls:
            self.in_mermaid += 1
            self.mermaid_count += 1
        elif tag in SKIP_TEXT:
            self.skip += 1
        if "bridge" in cls:
            self.has_bridge = True
        if "widget" in cls:
            self.widget_count += 1
        if "quiz" in cls:
            self._quiz = {"answer": a.get("data-answer"), "keys": [], "line": self.getpos()[0]}
            self.quizzes.append(self._quiz)
        if tag == "li" and self._quiz is not None and a.get("data-k"):
            self._quiz["keys"].append(a["data-k"])
        if tag == "a" and self.current_section == "further-reading" and a.get("href", "").startswith("http"):
            self.ref_links += 1
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag == "code":
            self.in_code = max(0, self.in_code - 1)
        elif tag == "pre" and self.in_mermaid:
            self.in_mermaid = 0
        elif tag == "title":
            self.in_title = False
        elif tag == "h1":
            self.in_h1 = False
        elif tag == "h2":
            self.in_h2 = False
        elif tag == "section":
            self.current_section = None
        elif tag in SKIP_TEXT:
            self.skip = max(0, self.skip - 1)
        if tag == "div" and self._quiz is not None and "div" in self.stack:
            pass
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            # tolerate implicitly-closed elements (p, li) like browsers do
            while self.stack and self.stack[-1] != tag:
                self.stack.pop()
            if self.stack:
                self.stack.pop()

    def handle_data(self, data):
        if self.skip:
            return
        if self.in_title:
            self.title += data
        if self.in_h1:
            self.h1 += data
        if self.in_h2 and self.current_section:
            self.section_heading[self.current_section] += data
        if self.current_section and not self.in_mermaid:
            self.section_text[self.current_section].append(data)
        self.words += len(data.split())


def validate(path: Path, known: set[str]) -> tuple[ChapterParser, list[str], list[str]]:
    html = path.read_text(encoding="utf-8")
    p = ChapterParser()
    p.feed(html)
    errors = list(p.errors)
    warnings: list[str] = []
    cid = path.stem
    if p.body_chapter != cid:
        errors.append(f"<body data-chapter> is {p.body_chapter!r}, expected {cid!r}")
    if cid not in known:
        errors.append(f"{cid!r} is not listed in assets/js/toc.js")
    if cid not in FREEFORM:
        missing = [s for s in REQUIRED_SECTIONS if s not in p.sections]
        if missing:
            errors.append(f"missing sections: {', '.join(missing)}")
        else:
            order = [s for s in p.sections if s in REQUIRED_SECTIONS]
            if order != REQUIRED_SECTIONS:
                errors.append("sections out of order: " + ", ".join(order))
        if not p.has_bridge:
            errors.append("missing <div class=\"bridge\"> (Java bridge box) in introduction")
        if len(p.quizzes) < 5:
            warnings.append(f"only {len(p.quizzes)} quiz questions (want >= 5)")
        if p.mermaid_count + p.widget_count < 2:
            warnings.append("fewer than 2 diagrams/widgets")
        if p.ref_links < 4:
            warnings.append(f"only {p.ref_links} external links in further-reading (want >= 4)")
        if p.words < 6000:
            warnings.append(f"only ~{p.words} words (target 9,000+)")
    for q in p.quizzes:
        if not q["answer"] or q["answer"] not in q["keys"]:
            errors.append(f"line {q['line']}: quiz data-answer {q['answer']!r} not among options {q['keys']}")
    if "../assets/js/book.js" not in html:
        errors.append("missing ../assets/js/book.js include")
    if re.search(r"<style|style=\"", html):
        warnings.append("inline styles found — use components from AUTHORING.md")
    return p, errors, warnings


def build_index(parsed: dict[str, ChapterParser]) -> None:
    entries = []
    for cid, p in parsed.items():
        sections = []
        for sid in p.sections:
            text = re.sub(r"\s+", " ", " ".join(p.section_text.get(sid, []))).strip()
            heading = re.sub(r"\s+", " ", p.section_heading.get(sid, "")).strip() or sid
            sections.append({"id": sid, "h": heading, "t": text})
        entries.append({"id": cid, "title": re.sub(r"\s+", " ", p.h1).strip() or p.title, "s": sections})
    payload = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    INDEX_JS.write_text(
        "/* Generated by tools/build.py — do not edit by hand. */\nwindow.BOOK_SEARCH_INDEX = " + payload + ";\n",
        encoding="utf-8",
    )
    print(f"search index: {len(entries)} pages, {len(payload) / 1024:.0f} KiB -> {INDEX_JS.relative_to(ROOT)}")


def main(argv: list[str]) -> int:
    known = set(toc_ids())
    files = [Path(a).resolve() for a in argv] if argv else sorted(CHAPTERS.glob("*.html"))
    files = [f for f in files if not f.name.startswith("_")]
    parsed: dict[str, ChapterParser] = {}
    total_err = 0
    for f in files:
        p, errors, warnings = validate(f, known)
        parsed[f.stem] = p
        status = "FAIL" if errors else ("warn" if warnings else "ok  ")
        print(f"[{status}] {f.name}  (~{p.words:,} words, {p.mermaid_count} diagrams, {p.widget_count} widgets, {len(p.quizzes)} quiz)")
        for e in errors:
            print(f"        error: {e}")
        for w in warnings:
            print(f"        warn:  {w}")
        total_err += len(errors)
    if not argv:
        missing = [c for c in toc_ids() if not (CHAPTERS / f"{c}.html").exists()]
        if missing:
            print(f"\n{len(missing)} TOC chapters not yet written: {', '.join(missing)}")
        # index every page that exists, in TOC order
        order = {c: i for i, c in enumerate(toc_ids())}
        build_index(dict(sorted(parsed.items(), key=lambda kv: order.get(kv[0], 999))))
    return 1 if total_err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
