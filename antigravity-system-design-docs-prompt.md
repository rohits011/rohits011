# Antigravity Prompt: Beginner-Friendly System Design & Design Patterns Learning Docs

Copy everything below the line into your Antigravity session.

---

## ROLE

You are a senior software engineer and technical educator. You write learning material that a **beginner developer** (knows basic programming: variables, functions, classes, loops; has never studied system design) can read top to bottom and actually understand, then reproduce in code.

## GOAL

Create a complete, example-driven learning documentation set that teaches **(A) Design Patterns** and **(B) System Design**, with **runnable code** for every concept. A beginner should finish it able to explain each concept, recognize when to use it, and implement a small version of it.

## LANGUAGE & TOOLING

- Primary code language: **[PYTHON / TYPESCRIPT / JAVA — pick one]**. Use only this language for all examples so the learner never context-switches.
- Docs format: Markdown, one file per topic, plus an index.
- Every code example must be **runnable** and **verified by you**: run it in the terminal and paste the real output into the doc. Do not invent output.
- Use only the standard library unless a dependency is essential (justify it if so).

## OUTPUT STRUCTURE

Create this folder layout:

```
learning-docs/
├── README.md                      # Index, learning path, how to use the docs
├── 00-prerequisites/              # OOP basics, interfaces, SOLID in plain English
├── 01-design-patterns/
│   ├── creational/                # Singleton, Factory Method, Abstract Factory, Builder, Prototype
│   ├── structural/                # Adapter, Decorator, Facade, Proxy, Composite
│   ├── behavioral/                # Strategy, Observer, Command, State, Template Method, Iterator, Chain of Responsibility
│   └── NN-<pattern>.md            # one doc per pattern
├── 02-system-design/
│   ├── 01-fundamentals.md         # client/server, HTTP, latency vs throughput, scaling
│   ├── 02-load-balancing.md
│   ├── 03-caching.md
│   ├── 04-databases-sql-vs-nosql.md
│   ├── 05-indexing-sharding-replication.md
│   ├── 06-message-queues-async.md
│   ├── 07-api-design-rest-rate-limiting.md
│   ├── 08-cap-theorem-consistency.md
│   ├── 09-microservices-vs-monolith.md
│   └── 10-reliability-observability.md
├── 03-case-studies/               # Full designs, built step by step
│   ├── url-shortener.md
│   ├── rate-limiter.md
│   ├── chat-application.md
│   └── news-feed.md
├── 04-exercises/                  # Practice + solutions (solutions in separate files)
├── code/                          # All runnable code, mirrors the docs structure
│   └── tests/                     # Tests proving each example works
└── glossary.md                    # Every term defined in one plain sentence
```

## MANDATORY TEMPLATE — EVERY DESIGN PATTERN DOC

Use exactly these sections, in this order:

1. **One-line summary** — what it is in plain English.
2. **The problem (story first)** — a relatable scenario (e.g., a coffee shop, a food-delivery app) where the *naive code hurts*.
3. **Bad code first** — show the naive/anti-pattern version, run it, and show *why* it breaks when requirements change.
4. **The pattern** — the idea explained with an analogy, then a **diagram** (Mermaid UML/class or sequence diagram).
5. **Step-by-step implementation** — build the solution incrementally, with comments on every non-obvious line.
6. **Full runnable example + real output.**
7. **Before vs After** comparison table (flexibility, testability, readability).
8. **When to use / When NOT to use** — including over-engineering warnings.
9. **Common mistakes** beginners make.
10. **Real-world usage** — where this appears in real frameworks/libraries.
11. **Related patterns** — and how they differ.
12. **Quick quiz (5 questions)** with answers hidden under `<details>` blocks.
13. **Mini exercise** — a small task with a starter file, and the solution in `04-exercises/`.

## MANDATORY TEMPLATE — EVERY SYSTEM DESIGN DOC

1. **Why this matters** — the real-world pain it solves.
2. **Start tiny** — the simplest working system (single server, single DB) in code.
3. **Make it break** — simulate load/failure with a runnable script and show the numbers.
4. **Introduce the concept** — analogy, then Mermaid architecture diagram.
5. **Implement a miniature version in code** (e.g., a round-robin load balancer, an LRU cache, a token-bucket rate limiter, a simple message queue) — small enough to read in one sitting.
6. **Measure the improvement** — benchmark before vs after with real output.
7. **Trade-offs table** — pros, cons, cost, complexity.
8. **Interview-style Q&A** — 5 questions with model answers.
9. **Common pitfalls** and failure scenarios.
10. **Quiz + mini exercise.**

## MANDATORY TEMPLATE — CASE STUDIES

Walk through like a real design session:
1. Requirements (functional + non-functional) → 2. Back-of-envelope estimation (show the math) → 3. API design → 4. Data model → 5. High-level diagram → 6. Deep dive on 2 hard components → 7. Bottlenecks & scaling → 8. Trade-offs & alternatives → 9. **A working prototype in code** → 10. Which patterns from `01-design-patterns/` were used and where (cross-link them).

## WRITING RULES (STRICT)

- **Assume zero prior knowledge.** Define every term the first time it appears; link to `glossary.md`.
- **Explain "why" before "how".** Never show a pattern without first showing the pain it removes.
- **Analogies first, jargon second.** Use everyday analogies, then map them to technical terms.
- **Short paragraphs, short sentences.** No walls of text. Use headings, tables, and bullets.
- **Every diagram is Mermaid** so it renders in Markdown; add a one-sentence caption explaining how to read it.
- **Every code block has a purpose line above it** and comments inside it. Keep examples under ~80 lines; split bigger ones.
- **Use realistic domain names** (Order, Payment, Notification) — not `Foo`/`Bar`.
- **Be honest about trade-offs.** Patterns are not always good; say when they are overkill.
- **Progressive difficulty:** each doc may only rely on concepts from earlier docs. State prerequisites at the top.
- **Consistent tone:** friendly, encouraging, like a mentor — not academic.
- Do not pad with filler or marketing language.

## QUALITY GATES (DO THESE BEFORE FINISHING)

1. Run **every** code file and every test; fix failures. Paste the real output in docs.
2. Check that all internal links and relative paths resolve.
3. Check that every Mermaid diagram has valid syntax.
4. Confirm each doc follows its template — list any deviations.
5. Re-read each doc as a beginner: flag and rewrite any sentence that uses an undefined term.
6. Produce a final `CHECKLIST.md` summarizing: docs created, code files run, tests passed, known gaps.

## WORKFLOW

1. First, **produce a plan** (outline of all files + the learning path order) and wait for my approval.
2. Then build in **batches**: (1) prerequisites + README + glossary, (2) design patterns by category, (3) system design fundamentals, (4) case studies, (5) exercises.
3. After each batch, run all code, summarize what was created, and ask whether to continue.
4. Keep a running `PROGRESS.md` so work can resume if interrupted.

## DEFINITION OF DONE

A beginner who reads `README.md` and follows the learning path can: explain each pattern and system design concept in their own words, spot the problem each one solves in messy code, implement the mini examples without looking, and walk through the four case studies like an interview.

Start now with the plan only.
