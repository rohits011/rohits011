# Authoring Contract

Every chapter in this book is a standalone HTML file at `chapters/<id>.html`, where `<id>` matches an entry in `assets/js/toc.js`.
The shared shell (header, sidebar, search, prev/next, progress bar, theming, code highlighting, Mermaid, KaTeX, quizzes, widgets) is injected by `assets/js/book.js`. **Chapter files contain only content.** Do not add CSS, `<script>` blocks (other than the four standard includes), or inline styles.

The reader is a Java/Spring Boot backend engineer with 5 years of experience who can also work in Python and Go. **Never teach basic programming, Java syntax, OOP, or basic REST/CRUD.** Use their Spring Boot experience as the anchor and go deep.

---

## 1. File skeleton (copy exactly, then fill)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chapter Title — AI-Era Software Engineering</title>
<meta name="description" content="One-sentence summary of the chapter.">
<link rel="stylesheet" href="../assets/css/book.css">
<script src="../assets/js/theme-init.js"></script>
</head>
<body data-chapter="p2-07-kafka-event-driven" data-root="..">
<article class="chapter" id="content">

<header class="chapter-head">
  <p class="eyebrow">Part 2 · Chapter 7</p>
  <h1>Kafka Internals, Message Queues &amp; Event-Driven Architecture</h1>
  <p class="lede">Two or three sentences on what this chapter delivers and why it matters.</p>
  <ul class="chapter-meta">
    <li><strong>Prerequisites:</strong> …</li>
    <li><strong>You will be able to:</strong> …</li>
  </ul>
</header>

<!-- the 17 sections, in order, see §2 -->

</article>
<script src="../assets/js/toc.js"></script>
<script src="../assets/js/widgets.js"></script>
<script src="../assets/js/book.js"></script>
</body>
</html>
```

## 2. Mandatory section order

Each chapter is one or more **substantial topics**. Every chapter contains these 17 `<section>` elements, in this order, with these exact `id`s (the validator checks them). Headings may be customised after the number, e.g. `<h2>4. Internal Working: How a Produce Request Becomes a Durable Record</h2>`.

| # | id | Purpose |
|---|----|---------|
| 1 | `introduction` | What it is, why it exists, which problems it solves. **Must include the Java bridge box (§3).** |
| 2 | `history` | How it evolved and why modern engineering needs it. Dates must be real. |
| 3 | `fundamentals` | Every underlying concept, before anything advanced. One `<h3>` per subtopic. |
| 4 | `internals` | What happens internally, step by step. |
| 5 | `architecture` | Mermaid diagrams (architecture/sequence/flow/class/ER/state) and interactive widgets, each explained immediately after. |
| 6 | `math` | Formulas, calculations, complexity. Intuition first, then formal notation. If truly N/A, say why in 2–3 sentences and give the relevant back-of-envelope numbers instead. |
| 7 | `code` | Complete, runnable examples. Java/Spring Boot first where relevant, then Python and/or Go. Use code tabs to compare. |
| 8 | `applications` | How real engineering teams use this. |
| 9 | `case-studies` | Verifiable company examples with links to the original source (engineering blog, paper, docs). |
| 10 | `tradeoffs-limits` | Advantages and limitations incl. operational cost. Use a comparison table. |
| 11 | `tradeoffs` | Engineering trade-offs: why one solution over another; decision table or flowchart. |
| 12 | `mistakes` | Misconceptions, implementation errors, production failures. |
| 13 | `production` | Performance, security, scalability, monitoring, reliability, maintainability. |
| 14 | `exercises` | ≥4 exercises, increasing difficulty, each with a `<details class="solution">`. |
| 15 | `interview` | ≥8 Q&As: conceptual, architectural, coding, scenario. Use `<details class="qa">`. |
| 16 | `knowledge-check` | Key-takeaway list + ≥5 quiz questions (§5). |
| 17 | `further-reading` | Books, official docs, papers, courses. Real resources only. |

Section markup:

```html
<section id="internals">
  <h2>4. Internal Working</h2>
  <h3>4.1 The produce path</h3>
  <p>…</p>
</section>
```

## 3. The Java bridge box (mandatory in §1 of every chapter)

```html
<div class="bridge">
  <h4>Bridging from Java &amp; Spring Boot</h4>
  <dl>
    <dt>What you already know</dt><dd>…Spring/Java equivalent you have used…</dd>
    <dt>Why that is not enough</dt><dd>…</dd>
    <dt>The modern approach</dt><dd>…</dd>
    <dt>Where Python and Go fit</dt><dd>…</dd>
    <dt>In production</dt><dd>…</dd>
    <dt>Use it when / avoid it when</dt><dd>…</dd>
  </dl>
</div>
```

## 4. Content components

**Callouts** — `note`, `tip`, `warn`, `danger`, `java` (Spring/Java angle), `insight`:

```html
<div class="callout tip"><p class="callout-title">Tip</p><p>…</p></div>
```

**Truth labels** — distinguish verified facts, illustrative examples, and opinion. Use these inline wherever ambiguity is possible (always on case studies, numbers, and recommendations):

```html
<span class="tag fact">Verified</span>      <!-- backed by a cited source -->
<span class="tag illus">Illustrative</span> <!-- made-up example numbers/companies for teaching -->
<span class="tag opinion">Opinion</span>    <!-- engineering judgement -->
<span class="tag version">Version-sensitive · checked Nov 2026</span>
```

**Code** — HTML-escape everything inside `<code>`: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`. Java generics (`List&lt;String&gt;`) and Go channels (`&lt;-ch`) are the most common breakages. Always set the language class: `language-java`, `language-python`, `language-go`, `language-sql`, `language-yaml`, `language-bash`, `language-json`, `language-dockerfile`, `language-hcl`, `language-xml`, `language-properties`, `language-javascript`, `language-typescript`, `language-plaintext`.

```html
<pre><code class="language-java">Map&lt;String, List&lt;Order&gt;&gt; byCustomer = …;</code></pre>
```

Optional filename label:

```html
<pre data-file="OrderService.java"><code class="language-java">…</code></pre>
```

**Code tabs** (Java vs Python vs Go comparisons):

```html
<div class="code-tabs">
  <pre data-lang="Java"><code class="language-java">…</code></pre>
  <pre data-lang="Python"><code class="language-python">…</code></pre>
  <pre data-lang="Go"><code class="language-go">…</code></pre>
</div>
```

**Mermaid diagrams** — always followed by a caption and an explanatory paragraph. Do **not** use `<br>` or raw `<`/`>` inside Mermaid (escape as `&lt;`/`&gt;` or rephrase). Quote labels containing punctuation: `A["Kafka (3 brokers)"]`.

```html
<figure class="diagram">
<pre class="mermaid">
sequenceDiagram
  participant P as Producer
  participant L as Leader
  P->>L: ProduceRequest(acks=all)
</pre>
<figcaption>Figure 7.3 — Produce path with acks=all.</figcaption>
</figure>
<p><strong>Reading the diagram:</strong> …</p>
```

**ASCII / memory illustrations** — use `<pre class="ascii">…</pre>` (escape `<`, `>`).

**Math (KaTeX)** — inline `\( a^2 + b^2 \)`, display `\[ \hat{y} = \sigma(w^\top x + b) \]`. Escape `<`/`>`/`&` as entities inside HTML. Always give the intuition first in prose.

**Expandable deep dives**:

```html
<details class="deep"><summary>Deep dive: why ISR shrinkage causes unavailability</summary><div>…</div></details>
```

**Comparison tables**: `<div class="table-wrap"><table>…</table></div>`.

**Exercises**:

```html
<div class="exercise">
  <p class="exercise-title">Exercise 3 · Intermediate</p>
  <p>…</p>
  <details class="solution"><summary>Solution</summary><div>…</div></details>
</div>
```

**Interview Q&A**:

```html
<details class="qa"><summary><span class="qa-kind">Scenario</span> Your consumer lag is growing… what do you do?</summary><div>…answer…</div></details>
```

`qa-kind` ∈ Conceptual, Architecture, Coding, Scenario, Behavioral.

**Quiz** (inside `knowledge-check`):

```html
<div class="quiz" data-answer="b">
  <p class="q">Which setting guarantees no data loss when one broker fails?</p>
  <ol>
    <li data-k="a">acks=1</li>
    <li data-k="b">acks=all with min.insync.replicas=2 and RF=3</li>
    <li data-k="c">…</li>
    <li data-k="d">…</li>
  </ol>
  <div class="explain">Why b is correct and the others are not.</div>
</div>
```

**Key takeaways**: `<ul class="takeaways"><li>…</li></ul>`

**References**:

```html
<ul class="refs">
  <li><span class="ref-kind">Book</span> Martin Kleppmann, <em>Designing Data-Intensive Applications</em>, O'Reilly, 2017 — ch. 11.</li>
  <li><span class="ref-kind">Docs</span> <a href="https://kafka.apache.org/documentation/">Apache Kafka documentation</a></li>
  <li><span class="ref-kind">Paper</span> <a href="…">…</a></li>
</ul>
```

`ref-kind` ∈ Book, Docs, Paper, Blog, Course, Talk, Spec, Video, Repo.

## 5. Interactive widgets

Embed with `<div class="widget" data-widget="NAME"></div>`, inside a `<figure class="diagram">` with a figcaption, followed by a paragraph that explains what to try. Available widgets:

| NAME | What it shows | Best chapter(s) |
|------|---------------|-----------------|
| `load-balancer` | Round-robin / weighted / least-connections / random / P2C distribution across heterogeneous servers | p2-02 |
| `rate-limiter` | Token bucket vs fixed window vs sliding-window log under bursts | p2-02, p11-03 |
| `consistent-hashing` | Hash ring, virtual nodes, keys moved on node add/remove | p2-03, p2-05 |
| `cache-eviction` | LRU vs LFU vs FIFO hit ratio on Zipf workloads with configurable cache size | p2-03 |
| `btree` | Step-by-step B-tree insertion with configurable order | p2-04, p3-04 |
| `quorum` | N/W/R quorum, replica failures, read-your-writes and availability | p2-05, p2-06 |
| `saga` | Orchestrated saga with failure injection and compensations; 2PC comparison | p2-06 |
| `kafka-consumer-group` | Partition assignment (range / round-robin / sticky) and rebalancing | p2-07 |
| `circuit-breaker` | Closed / open / half-open state machine vs failure rate | p2-08 |
| `big-o` | Growth curves of common complexities with adjustable n | p3-01 |
| `sorting` | Insertion / merge / quick / heap sort step visualiser | p3-03 |
| `graph-traversal` | BFS vs DFS vs Dijkstra on an editable grid | p3-05 |
| `gradient-descent` | Gradient descent on a 1-D/2-D loss with learning-rate & momentum | p6-01, p7-01 |
| `bias-variance` | Polynomial degree vs train/test error (over/underfitting) | p6-05 |
| `kmeans` | K-means iterations on 2-D points | p6-04 |
| `neural-net` | A small MLP learning XOR / circles / spirals live with a decision boundary | p7-01 |
| `attention` | Scaled dot-product self-attention heatmap over a sentence | p7-03, p8-01 |
| `tokenizer` | Byte-pair-encoding merges learned from text | p8-01 |
| `sampling` | Temperature, top-k, top-p effect on next-token distribution | p8-01 |
| `rag-retrieval` | Chunking, BM25 vs vector vs hybrid (RRF) retrieval over a mini corpus | p8-04 |

## 6. Quality bar

* **Depth over breadth.** If a topic has subtopics, explain every subtopic — do not just name them. A chapter is typically 9,000–16,000 words of HTML content.
* **Executable code.** Imports, package declarations, and versions where relevant. Mark partial snippets explicitly.
* **No fabrication.** No invented quotes, statistics, URLs, benchmarks, or company stories. If you cannot verify a claim, either drop it or label it `Illustrative` / `Opinion`. Prefer linking to original sources (company engineering blogs, official docs, papers on arXiv/ACM/USENIX).
* **Version-sensitive claims** (library versions, cloud limits, pricing, model names) get a `version` tag.
* **Diagrams earn their place.** Every diagram is explained right after it.
* **Security-defensive only.** Attack techniques are described so they can be prevented, with secure implementations; lab examples run locally.
* Run `python3 tools/build.py` before finishing; it validates sections, escaping, and regenerates the search index.
