# AI-Era Software Engineering — an interactive textbook

A deep, interactive HTML textbook that takes an experienced Java/Spring Boot backend engineer through:

1. Modern software engineering and the AI industry
2. **Advanced system design and distributed systems** (priority)
3. **Data structures and algorithms** (priority)
4. Python for backend, AI and data engineering
5. Go for high-performance backends
6. Machine-learning fundamentals (from the mathematics up)
7. Deep learning and neural networks
8. **Generative AI and LLM engineering** (priority)
9. Data science and data engineering
10. MLOps and AI infrastructure
11. **Cybersecurity for software engineers** (priority)
12. Cloud-native engineering and DevOps
13. Capstone projects

There is also a 12-month roadmap (10–15 h/week) and a reference library.

## Reading it

No build step and no server are required.

```bash
# Option 1: open the file directly
xdg-open index.html        # macOS: open index.html · Windows: start index.html

# Option 2: serve the folder (recommended; enables clipboard copy on all browsers)
python3 -m http.server 8000   # then visit http://localhost:8000
```

Everything works offline. highlight.js, Mermaid and KaTeX are vendored under `assets/vendor/`, and the search index is pre-built.

### Features

- Sidebar table of contents, chapter-wise previous/next navigation, an on-this-page outline and scroll-spy
- Full-text search across every chapter (`/` or `Ctrl/Cmd+K`)
- Reading-progress bar, per-chapter completion tracking, bookmarks and "continue reading"
- Dark and light themes (follows the OS theme until you choose one)
- Syntax-highlighted code with copy buttons and Java / Python / Go tabs
- Mermaid architecture, sequence, state, ER and flow diagrams, plus KaTeX mathematics
- Scored knowledge-check quizzes, expandable exercise solutions and interview Q&A
- 20 interactive simulations: load balancing, rate limiting, consistent hashing, cache eviction, B-trees, quorums, sagas vs 2PC, Kafka consumer groups, circuit breakers, Big-O, sorting, graph search, gradient descent, bias–variance, k-means, a live-training neural network, attention, BPE tokenisation, LLM sampling, and RAG retrieval
- Print-friendly styles: *Print / PDF* expands every answer and hides navigation

Progress, quiz answers, bookmarks and theme are kept in your browser's `localStorage` only.

## Repository layout

```
index.html                 home page
chapters/<id>.html         one file per chapter (ids listed in assets/js/toc.js)
assets/css/book.css        all styles (themes, components, widgets, print)
assets/js/toc.js           table of contents: the single source of navigation order
assets/js/book.js          shell: navigation, search, quizzes, tabs, progress, lazy loaders
assets/js/widgets*.js      interactive simulations (algo and ML bundles load on demand)
assets/js/search-index.js  generated full-text index
assets/vendor/             highlight.js 11.9.0, Mermaid 11.4.1, KaTeX 0.16.11 (MIT licences included)
tools/build.py             validator + search-index generator (Python 3, no dependencies)
AUTHORING.md               the contract every chapter follows (structure, components, quality bar)
```

## Editing or adding chapters

1. Add or modify the entry in `assets/js/toc.js`.
2. Write `chapters/<id>.html` following [AUTHORING.md](AUTHORING.md). Every chapter has the same 17 sections, from Introduction through Further Reading.
3. Run `python3 tools/build.py`. It validates structure, HTML escaping inside code and diagrams, and quiz answers, then regenerates the search index.

## Content policy

Explanations, diagrams, code and exercises are original. Established textbooks are cited as further reading, not reproduced. Claims are labelled **Verified**, **Illustrative**, **Opinion** or **Version-sensitive**; see `chapters/references.html`. Security content is defensive and intended for authorised lab environments.
