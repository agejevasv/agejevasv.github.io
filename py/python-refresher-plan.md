# Python Refresher Learning Plan (2026)

## Phase 0: Core Python

**Goal**: Solid foundation in Python fundamentals, written in modern style. If you know these cold, skip to Phase 1.

| Topic | What to Learn | Priority |
|-------|--------------|----------|
| **Data structures** | lists, dicts, sets, tuples, deques; comprehensions (list/dict/set/generator); performance tradeoffs | Must |
| **Functions** | closures, decorators, `*args`/`**kwargs`, first-class functions, `functools.partial`, `lru_cache` | Must |
| **Iteration** | iterators, generators, `yield`/`yield from`, `itertools`, generator expressions | Must |
| **OOP** | dunders (`__repr__`, `__eq__`, `__hash__`, `__lt__`), inheritance vs composition, `super()`, MRO, ABCs, `@property` | Must |
| **Error handling** | `try`/`except`/`else`/`finally`, custom exceptions, exception chaining (`from`) | Must |
| **Context managers** | `with`, `__enter__`/`__exit__`, `@contextmanager`, `@asynccontextmanager` | Must |
| **Modules & imports** | packages, `__init__.py`, relative vs absolute, circular imports, `__all__` | Know |
| **Scoping** | LEGB rule, `nonlocal`, closure gotchas (late binding, mutable defaults) | Know |
| **String handling** | bytes vs str, encoding/decoding, `pathlib` | Know |
| **Stdlib essentials** | `collections` (defaultdict, Counter, deque), `functools`, `pathlib`, `re`, `datetime`/`zoneinfo` | Must |

---

## Phase 1: What's New in 3.10–3.14

**Goal**: Learn the genuinely new language features. Assumes Phase 0 knowledge.

| Topic | What to Learn | Priority |
|-------|--------------|----------|
| **Protocols** | Structural typing, `@runtime_checkable`, Protocol composition | Must |
| **Pattern matching** | `match`/`case` (3.10+) — structural, guard clauses, dataclass matching | Must |
| **Dataclasses** | `@dataclass(frozen=True, slots=True)`, `field()`, replaces most `__init__` boilerplate | Must |
| **Walrus operator** | `:=` in `if`, `while`, comprehensions | Quick |
| **Positional-only params** | `/` separator in signatures | Know |
| **Exception groups** | `except*` (3.11+), `TaskGroup` error handling | Know |
| **Type parameter syntax** | `class Container[T]:` (3.12+), replaces `TypeVar` boilerplate | Know |
| **Enum & StrEnum** | `enum.Enum`, `StrEnum` (3.11+), `auto()`, `@unique` | Must |
| **`typing.Annotated`** | Attach metadata to types, used by FastAPI/Typer for dependency injection | Know |

---

## Phase 2: Environment Management & Tooling

**The ecosystem has consolidated around Astral's Rust-based tools.**

| Tool | Replaces | Key Commands |
|------|----------|-------------|
| **uv** | pip, venv, pyenv, pip-tools | `uv init`, `uv add <pkg>`, `uv sync`, `uv python install 3.13`, `uv run pytest` |
| **Ruff** | flake8, black, isort, pyflakes | `ruff check`, `ruff format`, `ruff check --fix` |
| **pyproject.toml** | setup.py, setup.cfg, requirements.txt | PEP 621 `[project]` table is the standard |
| **mypy** | manual type verification | `uv run mypy src/` — verifies type hints are correct |
| **pre-commit** | manual lint-before-commit | `.pre-commit-config.yaml` + `pre-commit install` |

**Learning order**:
1. Install `uv` and `ruff` → create a project with `uv init`
2. Understand `pyproject.toml` structure (dependencies, scripts, tool config)
3. Configure Ruff in `pyproject.toml` under `[tool.ruff]`
4. Set up mypy for type checking (`uv add --dev mypy`)
5. Add pre-commit hooks for automated quality checks
6. For data science: know **mamba/miniforge** (fast conda alternative)

**Also covered**: Docker (containerizing with uv), packaging & publishing (`uv build`, `uv publish`), security basics (dependency auditing, secrets management).

---

## Phase 3: Concurrency & Threading

**Decision tree**:
```
Is it I/O-bound?
  ├─ Yes → asyncio + TaskGroup (modern standard)
  │        or ThreadPoolExecutor (legacy/simple cases)
  └─ No (CPU-bound) → ProcessPoolExecutor
                       or multiprocessing.shared_memory
```

| Concept | Status in 2026 |
|---------|---------------|
| **GIL** | Still on by default. Free-threaded mode (PEP 703) is *supported* in 3.14 but not default. Expected default ~2028. |
| **asyncio.TaskGroup** | The modern standard (3.11+). Replaces `gather()` with structured concurrency. |
| **`asyncio.to_thread()`** | Bridge blocking code into async — know this pattern |
| **asyncio.Queue** | Producer/consumer pattern, bounded queues for backpressure |
| **concurrent.futures** | `ThreadPoolExecutor` (I/O) and `ProcessPoolExecutor` (CPU) — simplest parallel API |
| **anyio** | Use in libraries that need to work with both asyncio and Trio |

**Practice**: Build a small async web scraper with `httpx` + `asyncio.TaskGroup`.

---

## Phase 4: Essential Libraries

### Core Stack (learn these first)

| Category | Library | Why |
|----------|---------|-----|
| **Web framework** | **FastAPI** | Async-first, auto OpenAPI docs, Pydantic integration. 38% adoption, the default for new APIs |
| **Data validation** | **Pydantic v2** | 5-50x faster than v1 (Rust core). Used by FastAPI, LangChain, HF |
| **HTTP client** | **httpx** | Sync + async, HTTP/2, replaces `requests` for modern code |
| **Testing** | **pytest** + **Hypothesis** | pytest is standard; Hypothesis for property-based testing |
| **Database** | **SQLAlchemy 2.0** + **asyncpg** + **Alembic** | Async ORM; 2.0 has cleaner API; Alembic for schema migrations |
| **CLI** | **Typer** | Type-hint based CLI, minimal code |
| **Logging** | **structlog** | Structured JSON logging, processor pipelines |

### Performance & Data

| Category | Library | When |
|----------|---------|------|
| **DataFrames** | **Polars** | Large datasets (5x faster, 87% less memory than pandas). Learn lazy API |
| **DataFrames** | **pandas** | Small/medium data, ML integration, legacy code |
| **SQL analytics** | **DuckDB** | Analytical queries on files, in-process OLAP |
| **Fast JSON** | **orjson** / **msgspec** | High-throughput APIs (16x faster than stdlib json) |
| **Observability** | **OpenTelemetry** | Traces + metrics + logs across services |

---

## Phase 5: AI/ML Domain

### 5a. Foundations

| Topic | Tool | Notes |
|-------|------|-------|
| **NumPy 2.0** | `numpy` | Breaking changes from 1.x — review migration |
| **scikit-learn** | `sklearn` | v1.8 — GPU support, improved visualization |
| **PyTorch** | `torch` | Dominates research (85% of papers). `torch.compile()` for 30-60% speedups |
| **Keras 3** | `keras` | Multi-backend (TF, PyTorch, JAX) — good abstraction layer |

### 5b. LLMs & GenAI

| Topic | Tool | Notes |
|-------|------|-------|
| **Provider SDKs** | `anthropic`, `openai` | Direct API access — start here |
| **Hugging Face** | `transformers`, `datasets`, `diffusers` | 2M+ models, industry standard hub |
| **Orchestration** | **LangChain** | 50+ provider integrations, chains & agents |
| **RAG** | **LlamaIndex** | 100+ data connectors, best-in-class for RAG |
| **Agents** | **CrewAI** or **LangGraph** | CrewAI for simple multi-agent; LangGraph for complex stateful workflows |
| **Prompt engineering** | Patterns | System prompts, few-shot, chain-of-thought, structured output via tool_use |
| **Evaluation** | `deepeval`, `ragas` | Golden datasets, model-as-judge, RAG metrics |
| **MCP** | `mcp` SDK | Model Context Protocol — standard for connecting LLMs to external tools/data |

### 5c. Infrastructure

| Topic | Tool | Notes |
|-------|------|-------|
| **Vector DB** | **ChromaDB** (dev), **pgvector** (prod), **Pinecone** (managed) | ChromaDB rewrote in Rust (4x faster) |
| **MLOps** | **W&B** or **MLflow** | W&B for cutting-edge; MLflow for open-source |
| **Notebooks** | **Jupyter** + **Jupyter AI** | Built-in AI code generation |
| **Data** | **Polars** + **DuckDB** | Modern replacement for pandas-heavy pipelines |

---

## Suggested Learning Path

```
Week 1:  Phase 0 (core language)
         → Work through examples, write small programs using generators,
           decorators, context managers, and stdlib tools

Week 2:  Phase 1 (new features) + Phase 2 (tooling)
         → Set up uv + ruff + mypy, rewrite a small project with modern idioms

Week 3:  Phase 3 (concurrency) + Phase 4 core libs
         → Build a FastAPI service with async DB access

Week 4:  Phase 4 data libs + Phase 5a (ML foundations)
         → Data pipeline with Polars, train a model with PyTorch

Week 5:  Phase 5b-c (LLMs, agents, eval, infra)
         → Build a RAG app with LlamaIndex + ChromaDB + Claude API
         → Evaluate it with golden datasets and model-as-judge
```

---

## Quick Reference: The Modern Python Project

```
my-project/
├── pyproject.toml          # PEP 621 — all config here
├── uv.lock                 # Deterministic lockfile
├── .pre-commit-config.yaml # Ruff + mypy hooks
├── Dockerfile              # Multi-stage with uv
├── src/
│   └── my_project/
│       ├── __init__.py
│       └── main.py
└── tests/
    └── test_main.py
```

```bash
# Bootstrap
uv init my-project && cd my-project
uv add fastapi httpx pydantic
uv add --dev pytest ruff mypy pre-commit
uv run ruff check
uv run mypy src/
uv run pytest
```
