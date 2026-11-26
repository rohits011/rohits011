/*
 * Table of contents — the single source of truth for navigation order.
 * Each chapter file lives at chapters/<id>.html.
 * "priority" marks chapters that matter most for an experienced Java/Spring backend engineer.
 */
window.BOOK_TOC = [
  {
    part: "Start Here",
    short: "Start",
    chapters: [
      { id: "roadmap", title: "The 12-Month Learning Roadmap", mins: 25 },
      { id: "references", title: "Reference Library & Research Policy", mins: 15 }
    ]
  },
  {
    part: "Part 1 — Modern Software Engineering and the AI Industry",
    short: "P1",
    chapters: [
      { id: "p1-01-evolution-ai-native", planned: true, title: "From Mainframes to AI-Native Engineering", mins: 45 },
      { id: "p1-02-ai-assisted-development", planned: true, title: "The Modern Backend Landscape & AI-Assisted Development", mins: 50 },
      { id: "p1-03-career-strategy", planned: true, title: "Durable Skills, Emerging Roles & Career Positioning", mins: 40 }
    ]
  },
  {
    part: "Part 2 — Advanced System Design and Distributed Systems",
    short: "P2",
    priority: true,
    chapters: [
      { id: "p2-01-system-design-foundations", title: "System Design Foundations: Requirements, Estimation & SLOs", mins: 70 },
      { id: "p2-02-scaling-traffic", title: "Scaling & Traffic: Load Balancers, Proxies, Gateways, Rate Limits", mins: 80 },
      { id: "p2-03-caching-redis", title: "Caching Strategies & Redis Internals", mins: 80 },
      { id: "p2-04-databases-indexing", title: "Database Selection, SQL vs NoSQL, Indexing & Query Optimization", mins: 90 },
      { id: "p2-05-replication-sharding", planned: true, title: "Replication, Partitioning & Sharding", mins: 80 },
      { id: "p2-06-consistency-transactions", title: "Consistency, CAP, Distributed Transactions, Sagas, Outbox & Idempotency", mins: 100 },
      { id: "p2-07-kafka-event-driven", title: "Kafka Internals, Message Queues & Event-Driven Architecture", mins: 110 },
      { id: "p2-08-microservices-resilience", title: "Microservices, Discovery, Circuit Breakers & Distributed Locks", mins: 90 },
      { id: "p2-09-ha-dr-multiregion", title: "Observability, High Availability, Disaster Recovery & Multi-Region", mins: 80 },
      { id: "p2-10-case-studies-messaging", title: "Case Studies I: URL Shortener, Messaging, Notifications", mins: 100 },
      { id: "p2-11-case-studies-commerce", title: "Case Studies II: E-Commerce, Payments, Video Streaming", mins: 110 },
      { id: "p2-12-case-studies-realtime-ai", title: "Case Studies III: Ride-Sharing, Real-Time Analytics, AI Chatbot", mins: 110 }
    ]
  },
  {
    part: "Part 3 — Data Structures and Algorithms",
    short: "P3",
    priority: true,
    chapters: [
      { id: "p3-01-complexity-arrays-hashing", title: "Complexity, Arrays, Strings & Hashing", mins: 70 },
      { id: "p3-02-linked-lists-stacks-queues", title: "Linked Lists, Stacks, Queues & Monotonic Structures", mins: 60 },
      { id: "p3-03-two-pointers-window-search", title: "Two Pointers, Sliding Window, Sorting & Binary Search", mins: 80 },
      { id: "p3-04-trees-heaps-tries", planned: true, title: "Trees, BSTs, Heaps & Tries", mins: 80 },
      { id: "p3-05-graphs", planned: true, title: "Graphs: Traversal, Topological Sort, Union-Find & Shortest Paths", mins: 90 },
      { id: "p3-06-recursion-backtracking-greedy", planned: true, title: "Recursion, Backtracking & Greedy", mins: 70 },
      { id: "p3-07-dynamic-programming", planned: true, title: "Dynamic Programming", mins: 100 },
      { id: "p3-08-problem-solving-playbook", planned: true, title: "The Senior Interview Problem-Solving Playbook", mins: 50 }
    ]
  },
  {
    part: "Part 4 — Python for Modern Backend, AI and Data Engineering",
    short: "P4",
    chapters: [
      { id: "p4-01-python-internals-concurrency", title: "Python Internals, Memory, the GIL & Concurrency", mins: 80 },
      { id: "p4-02-typing-pydantic-fastapi", title: "Type Hints, Pydantic, FastAPI & Dependency Injection", mins: 80 },
      { id: "p4-03-data-access-background-jobs", title: "SQLAlchemy, Database Integration, Celery & Task Queues", mins: 70 },
      { id: "p4-04-production-python", title: "Production Python: Testing, Packaging, Performance, Deployment & Java Interop", mins: 90 }
    ]
  },
  {
    part: "Part 5 — Go for High-Performance Backend Engineering",
    short: "P5",
    chapters: [
      { id: "p5-01-go-runtime-concurrency", planned: true, title: "The Go Runtime, Goroutines, Channels & Context", mins: 90 },
      { id: "p5-02-go-memory-interfaces-errors", planned: true, title: "Go Memory, Garbage Collection, Interfaces & Errors", mins: 70 },
      { id: "p5-03-go-services-grpc", planned: true, title: "Go Services: HTTP, Middleware, gRPC, Databases & Worker Pools", mins: 90 },
      { id: "p5-04-go-production-comparison", planned: true, title: "Production Go, Profiling & the Java vs Go vs Python Decision", mins: 70 }
    ]
  },
  {
    part: "Part 6 — Machine Learning Fundamentals",
    short: "P6",
    chapters: [
      { id: "p6-01-math-for-ml", title: "Mathematics for ML: Linear Algebra, Probability, Statistics, Calculus", mins: 100 },
      { id: "p6-02-data-preprocessing-features", title: "Data Preprocessing & Feature Engineering", mins: 70 },
      { id: "p6-03-supervised-learning", title: "Supervised Learning: Regression, Classification, Trees & Boosting", mins: 110 },
      { id: "p6-04-unsupervised-learning", title: "Unsupervised Learning: Clustering & Dimensionality Reduction", mins: 70 },
      { id: "p6-05-evaluation-tuning-interpretability", title: "Evaluation, Bias–Variance, Cross-Validation, Tuning & Interpretability", mins: 90 }
    ]
  },
  {
    part: "Part 7 — Deep Learning and Neural Networks",
    short: "P7",
    chapters: [
      { id: "p7-01-neural-network-fundamentals", planned: true, title: "Neural Networks: Perceptrons, Backpropagation & Optimizers", mins: 100 },
      { id: "p7-02-cnn-rnn-lstm", planned: true, title: "CNNs, RNNs & LSTMs", mins: 80 },
      { id: "p7-03-attention-transformers-embeddings", planned: true, title: "Attention, Transformers & Embeddings", mins: 100 },
      { id: "p7-04-gpu-training-evaluation", planned: true, title: "GPU Computing, Model Training & Evaluation", mins: 70 }
    ]
  },
  {
    part: "Part 8 — Generative AI and LLM Engineering",
    short: "P8",
    priority: true,
    chapters: [
      { id: "p8-01-llm-foundations", title: "LLM Foundations: Training, Tokenization, Context & Sampling", mins: 90 },
      { id: "p8-02-prompting-structured-tools", title: "Prompt Engineering, Structured Outputs, Tool Use & LLM APIs", mins: 90 },
      { id: "p8-03-models-finetuning-quantization", title: "Model Selection, Open Models, Fine-Tuning, LoRA/QLoRA & Quantization", mins: 90 },
      { id: "p8-04-rag-retrieval", planned: true, title: "RAG: Chunking, Vector Databases, Hybrid Search, Reranking & Evaluation", mins: 120 },
      { id: "p8-05-llm-reliability-operations", planned: true, title: "Hallucination, Guardrails, Evaluation, Observability, Cost & Multimodal", mins: 90 },
      { id: "p8-06-agents-mcp-security", planned: true, title: "Agentic AI, Multi-Agent Systems, MCP & AI Application Security", mins: 100 },
      { id: "p8-07-projects-knowledge-support-search", title: "Projects I: Document Q&A, Knowledge Assistant, Support Platform, AI Search", mins: 130 },
      { id: "p8-08-projects-agents-java-integration", title: "Projects II: Coding Assistant, Multi-Step Agent, Spring Boot + LLM, Python AI Service", mins: 130 }
    ]
  },
  {
    part: "Part 9 — Data Science and Data Engineering",
    short: "P9",
    chapters: [
      { id: "p9-01-data-science-lifecycle", title: "The Data Science Lifecycle, EDA, Statistics, Pandas & NumPy", mins: 80 },
      { id: "p9-02-analytical-sql-storage", title: "Analytical SQL, Warehouses, Lakes & the Lakehouse", mins: 80 },
      { id: "p9-03-pipelines-spark-streaming", title: "ETL/ELT, Apache Spark, Kafka Pipelines, Batch vs Streaming", mins: 90 },
      { id: "p9-04-quality-governance-orchestration", title: "Data Quality, Governance, Feature Stores, Airflow, dbt & Analytics Engineering", mins: 90 }
    ]
  },
  {
    part: "Part 10 — MLOps and AI Infrastructure",
    short: "P10",
    chapters: [
      { id: "p10-01-ml-lifecycle-mlflow", planned: true, title: "The ML Lifecycle, Experiment Tracking, Registries, MLflow & CI/CD for ML", mins: 80 },
      { id: "p10-02-serving-monitoring-drift", planned: true, title: "Model Serving, Deployment, Monitoring, Drift & Retraining", mins: 80 },
      { id: "p10-03-ai-infrastructure-gpus", planned: true, title: "AI Infrastructure: Kubernetes, GPUs, Inference Optimization, Distributed Training & Cost", mins: 90 }
    ]
  },
  {
    part: "Part 11 — Cybersecurity for Modern Software Engineers",
    short: "P11",
    priority: true,
    chapters: [
      { id: "p11-01-security-foundations-owasp", title: "Security Foundations, Threat Modeling & the OWASP Top 10", mins: 80 },
      { id: "p11-02-identity-oauth-oidc-jwt", title: "Authentication, Authorization, OAuth 2.0, OIDC, JWT & Sessions", mins: 90 },
      { id: "p11-03-appsec-vulnerabilities", title: "API Security, Injection, XSS, CSRF, SSRF & Secure Coding", mins: 90 },
      { id: "p11-04-crypto-cloud-supply-chain", title: "Secrets, Encryption, TLS, IAM, Cloud, Container, Kubernetes & Supply-Chain Security", mins: 100 },
      { id: "p11-05-ai-llm-security", planned: true, title: "AI/LLM Security: Prompt Injection, Data Leakage, Tool Execution & Agent Security", mins: 80 }
    ]
  },
  {
    part: "Part 12 — Cloud-Native Engineering and DevOps",
    short: "P12",
    chapters: [
      { id: "p12-01-linux-networking", title: "Linux & Networking Fundamentals for Backend Engineers", mins: 80 },
      { id: "p12-02-docker-kubernetes-helm", title: "Docker, Kubernetes & Helm", mins: 100 },
      { id: "p12-03-cicd-gitops-terraform", title: "CI/CD, GitOps, Infrastructure as Code & Terraform", mins: 80 },
      { id: "p12-04-aws-cloud-networking-serverless", title: "AWS Fundamentals, Cloud Networking & Serverless", mins: 80 },
      { id: "p12-05-observability-otel", planned: true, title: "Observability: Prometheus, Grafana, OpenTelemetry, Tracing & Logging", mins: 80 },
      { id: "p12-06-sre-incident-response", planned: true, title: "Reliability Engineering, SRE Principles & Incident Response", mins: 60 }
    ]
  },
  {
    part: "Part 13 — Advanced Engineering Capstone Projects",
    short: "P13",
    chapters: [
      { id: "p13-01-ai-saas-platform", title: "Capstone: Scalable AI-Powered SaaS Platform", mins: 90 },
      { id: "p13-02-enterprise-rag-platform", planned: true, title: "Capstone: Enterprise RAG Platform", mins: 90 },
      { id: "p13-03-realtime-event-processing", planned: true, title: "Capstone: Real-Time Event Processing System", mins: 80 },
      { id: "p13-04-ai-analytics-platform", planned: true, title: "Capstone: AI-Powered Analytics Platform", mins: 80 },
      { id: "p13-05-secure-microservices", planned: true, title: "Capstone: Secure Microservices Architecture", mins: 80 },
      { id: "p13-06-developer-productivity-platform", planned: true, title: "Capstone: Intelligent Developer Productivity Platform", mins: 80 }
    ]
  }
];
