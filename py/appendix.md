# Appendix: Gap Coverage

Supplementary material for topics mentioned in the learning plan but not covered in the phase files.

---

## 1. anyio (Phase 3 gap)

anyio is a compatibility layer that lets you write async code that works with both **asyncio** and **Trio**. Use it in libraries that need to be runtime-agnostic.

```bash
pip install anyio
```

### When to Use

- You're writing a **library** (not an application) that should work regardless of whether the consumer uses asyncio or Trio.
- You want structured concurrency primitives that work across runtimes.
- If you're writing an **application**, just use asyncio directly — anyio adds an unnecessary layer.

### Task Groups (structured concurrency)

```python
import anyio

async def fetch(url: str) -> str:
    await anyio.sleep(0.5)  # simulated I/O
    return f"Data from {url}"

async def main():
    async with anyio.create_task_group() as tg:
        results: list[str] = []

        async def worker(url: str):
            result = await fetch(url)
            results.append(result)

        tg.start_soon(worker, "https://api.example.com/users")
        tg.start_soon(worker, "https://api.example.com/products")
        tg.start_soon(worker, "https://api.example.com/orders")

    # All tasks complete when we exit the block
    for r in results:
        print(r)

# Works with asyncio
anyio.run(main)

# Would also work with Trio:
# anyio.run(main, backend="trio")
```

### Cancellation Scopes

```python
import anyio

async def main():
    # Timeout after 2 seconds
    with anyio.fail_after(2):
        await anyio.sleep(10)  # raises TimeoutError after 2s

    # Soft timeout — doesn't raise, just cancels
    with anyio.move_on_after(1) as scope:
        await anyio.sleep(10)

    if scope.cancelled_caught:
        print("Timed out, but we handled it gracefully")

anyio.run(main)
```

### Synchronization Primitives

```python
import anyio

async def main():
    # Semaphore — same concept as asyncio.Semaphore
    sem = anyio.Semaphore(3)

    async def limited_task(n: int):
        async with sem:
            print(f"Task {n} running")
            await anyio.sleep(0.5)
            print(f"Task {n} done")

    async with anyio.create_task_group() as tg:
        for i in range(10):
            tg.start_soon(limited_task, i)

    # Lock
    lock = anyio.Lock()
    counter = 0

    async def safe_increment():
        nonlocal counter
        async with lock:
            temp = counter
            await anyio.sleep(0)
            counter = temp + 1

anyio.run(main)
```

### Streams (channels)

```python
import anyio

async def producer(send_stream: anyio.abc.ObjectSendStream):
    async with send_stream:
        for i in range(5):
            await send_stream.send(f"item_{i}")
            await anyio.sleep(0.1)

async def consumer(receive_stream: anyio.abc.ObjectReceiveStream):
    async with receive_stream:
        async for item in receive_stream:
            print(f"Received: {item}")

async def main():
    send, receive = anyio.create_memory_object_stream(max_buffer_size=10)

    async with anyio.create_task_group() as tg:
        tg.start_soon(producer, send)
        tg.start_soon(consumer, receive)

anyio.run(main)
```

### anyio vs asyncio comparison

| Feature | asyncio | anyio |
|---|---|---|
| Task group | `asyncio.TaskGroup()` | `anyio.create_task_group()` |
| Sleep | `asyncio.sleep()` | `anyio.sleep()` |
| Semaphore | `asyncio.Semaphore()` | `anyio.Semaphore()` |
| Run blocking | `asyncio.to_thread()` | `anyio.to_thread.run_sync()` |
| Timeout | `asyncio.timeout()` | `anyio.fail_after()` / `anyio.move_on_after()` |
| Channels | `asyncio.Queue` | `anyio.create_memory_object_stream()` |
| Backend | asyncio only | asyncio or Trio |

---

## 2. OpenTelemetry (Phase 4 gap)

OpenTelemetry (OTel) provides a unified API for **traces**, **metrics**, and **logs** across services.

```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
pip install opentelemetry-instrumentation-fastapi opentelemetry-instrumentation-httpx
```

### Basic Tracing Setup

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    ConsoleSpanExporter,
)
from opentelemetry.sdk.resources import Resource

# 1. Configure the tracer provider
resource = Resource.create({"service.name": "my-api", "service.version": "1.0.0"})
provider = TracerProvider(resource=resource)

# Export spans to console (replace with OTLP exporter for production)
processor = BatchSpanProcessor(ConsoleSpanExporter())
provider.add_span_processor(processor)

trace.set_tracer_provider(provider)

# 2. Get a tracer
tracer = trace.get_tracer("my-api.main")

# 3. Create spans
@tracer.start_as_current_span("process_order")
def process_order(order_id: int) -> dict:
    span = trace.get_current_span()
    span.set_attribute("order.id", order_id)

    # Nested span
    with tracer.start_as_current_span("validate_order") as child:
        child.set_attribute("validation.type", "full")
        # ... validation logic ...

    with tracer.start_as_current_span("charge_payment"):
        # ... payment logic ...
        pass

    return {"order_id": order_id, "status": "completed"}

process_order(42)
provider.shutdown()
```

### OTLP Exporter (production)

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Send to a collector (Jaeger, Tempo, Datadog, etc.)
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
```

### FastAPI Auto-Instrumentation

```python
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    return {"user_id": user_id}

# One line — automatically creates spans for every request
FastAPIInstrumentor.instrument_app(app)
```

### httpx Auto-Instrumentation

```python
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# Instruments all httpx clients — propagates trace context across services
HTTPXClientInstrumentor().instrument()
```

### Metrics

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import ConsoleMetricExporter, PeriodicExportingMetricReader

reader = PeriodicExportingMetricReader(ConsoleMetricExporter(), export_interval_millis=5000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("my-api.metrics")

# Counter
request_counter = meter.create_counter(
    "http.requests.total",
    description="Total HTTP requests",
)

# Histogram
latency_histogram = meter.create_histogram(
    "http.request.duration",
    unit="ms",
    description="Request latency",
)

# Usage
request_counter.add(1, {"method": "GET", "path": "/users"})
latency_histogram.record(42.5, {"method": "GET", "path": "/users"})
```

### Context Propagation Across Services

```python
# Service A (caller) — trace context is automatically injected into headers
import httpx
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

HTTPXClientInstrumentor().instrument()

async def call_service_b():
    async with httpx.AsyncClient() as client:
        # OTel automatically adds traceparent header
        resp = await client.get("http://service-b:8000/process")
        return resp.json()

# Service B (callee) — FastAPIInstrumentor extracts the trace context
# Both services appear in the same trace in your observability platform
```

---

## 3. pandas Standalone Reference (Phase 4 gap)

A quick reference for pandas alongside Polars, since much existing code and ML tooling still uses it.

```bash
pip install pandas
```

### Core Operations

```python
import pandas as pd
import numpy as np

# --- Creation ---
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Diana"],
    "age": [30, 25, 35, 28],
    "city": ["NYC", "LA", "NYC", "LA"],
    "salary": [70_000, 60_000, 90_000, 75_000],
})

# --- Reading files ---
# df = pd.read_csv("data.csv")
# df = pd.read_parquet("data.parquet")
# df = pd.read_json("data.json")
# df = pd.read_excel("data.xlsx")

# --- Filtering ---
nyc = df[df["city"] == "NYC"]
young_high_earners = df[(df["age"] < 30) & (df["salary"] > 65_000)]

# query() — SQL-like syntax
result = df.query("city == 'NYC' and salary > 75_000")

# --- Selecting columns ---
names = df["name"]                    # Series
subset = df[["name", "salary"]]       # DataFrame
```

### GroupBy & Aggregation

```python
# GroupBy
stats = df.groupby("city").agg(
    avg_salary=("salary", "mean"),
    max_age=("age", "max"),
    count=("name", "count"),
).reset_index()

print(stats)
#   city  avg_salary  max_age  count
# 0   LA     67500.0       28      2
# 1  NYC     80000.0       35      2

# Pivot table
pivot = df.pivot_table(
    values="salary",
    index="city",
    aggfunc=["mean", "count"],
)
```

### Transformations

```python
# New columns
df["bonus"] = df["salary"] * 0.1
df["senior"] = df["age"] >= 30

# Apply
df["name_upper"] = df["name"].apply(str.upper)

# Map / replace
df["city_code"] = df["city"].map({"NYC": "NY", "LA": "CA"})

# Sorting
df_sorted = df.sort_values("salary", ascending=False)

# Drop / rename
df2 = df.drop(columns=["bonus"]).rename(columns={"name": "full_name"})
```

### Merging / Joining

```python
departments = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Diana"],
    "dept": ["Engineering", "Marketing", "Engineering", "Sales"],
})

merged = df.merge(departments, on="name", how="left")
```

### When to Use pandas vs Polars

| Scenario | Use pandas | Use Polars |
|---|---|---|
| Dataset fits in memory easily (< 1GB) | Yes | Either |
| Dataset is large (> 1GB) | Slow | Yes (lazy API) |
| ML pipeline (scikit-learn, PyTorch) | Yes (expected input) | Convert with `.to_pandas()` |
| Need SQL-like lazy evaluation | No | Yes |
| Legacy codebase | Yes | Migrate gradually |
| Maximum performance | No | Yes (5-10x faster) |

---

## 4. Pinecone (Phase 5 gap)

Pinecone is a fully managed vector database — no infrastructure to deploy.

```bash
pip install pinecone
```

### Setup and CRUD

```python
from pinecone import Pinecone, ServerlessSpec

# Initialize
pc = Pinecone(api_key="YOUR_API_KEY")

# Create an index
pc.create_index(
    name="knowledge-base",
    dimension=384,               # must match your embedding model
    metric="cosine",             # "cosine", "euclidean", or "dotproduct"
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1",
    ),
)

index = pc.Index("knowledge-base")
```

### Upsert and Query

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

# Upsert vectors
documents = [
    {"id": "doc1", "text": "Python is great for data science", "category": "tech"},
    {"id": "doc2", "text": "PostgreSQL supports vector search", "category": "database"},
    {"id": "doc3", "text": "FastAPI is an async web framework", "category": "tech"},
]

vectors = []
for doc in documents:
    embedding = model.encode(doc["text"]).tolist()
    vectors.append({
        "id": doc["id"],
        "values": embedding,
        "metadata": {"text": doc["text"], "category": doc["category"]},
    })

index.upsert(vectors=vectors)

# Query with metadata filtering
query_embedding = model.encode("How do I build web APIs?").tolist()

results = index.query(
    vector=query_embedding,
    top_k=3,
    include_metadata=True,
    filter={"category": {"$eq": "tech"}},  # metadata filter
)

for match in results["matches"]:
    print(f"  [{match['score']:.4f}] {match['metadata']['text']}")
```

### Namespaces (multi-tenant)

```python
# Upsert into a namespace
index.upsert(vectors=vectors, namespace="tenant-123")

# Query within a namespace
results = index.query(
    vector=query_embedding,
    top_k=3,
    namespace="tenant-123",
)
```

### Delete

```python
# Delete by IDs
index.delete(ids=["doc1", "doc2"])

# Delete by metadata filter
index.delete(filter={"category": {"$eq": "database"}})

# Delete entire namespace
index.delete(delete_all=True, namespace="tenant-123")
```

### ChromaDB vs pgvector vs Pinecone — When to Use Which

| | ChromaDB | pgvector | Pinecone |
|---|---|---|---|
| **Best for** | Prototyping, dev | Production with existing Postgres | Managed, large-scale |
| **Hosting** | Embedded / self-hosted | Your Postgres instance | Fully managed SaaS |
| **Scale** | Millions of vectors | Millions (limited by Postgres) | Billions |
| **Cost** | Free | Postgres hosting cost | Pay-per-use (can be expensive) |
| **Setup** | `pip install chromadb` | `CREATE EXTENSION vector` | API key |
| **Metadata filtering** | Yes | SQL WHERE clauses | Yes (JSON filters) |
| **Dependencies** | None (embedded) | PostgreSQL | Internet + API key |

---

## 5. Hugging Face diffusers (Phase 5 gap)

diffusers is the library for image generation models (Stable Diffusion, FLUX, etc.).

```bash
pip install diffusers transformers accelerate torch
```

### Text-to-Image

```python
from diffusers import StableDiffusionPipeline
import torch

# Load a model (downloads ~4GB on first run)
pipe = StableDiffusionPipeline.from_pretrained(
    "stabilityai/stable-diffusion-2-1",
    torch_dtype=torch.float16,
)
pipe = pipe.to("cuda")  # requires GPU

# Generate an image
image = pipe(
    prompt="A serene mountain landscape at sunset, digital art",
    negative_prompt="blurry, low quality",
    num_inference_steps=30,
    guidance_scale=7.5,
).images[0]

image.save("landscape.png")
```

### Image-to-Image

```python
from diffusers import StableDiffusionImg2ImgPipeline
from PIL import Image

pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
    "stabilityai/stable-diffusion-2-1",
    torch_dtype=torch.float16,
).to("cuda")

init_image = Image.open("sketch.png").resize((512, 512))

result = pipe(
    prompt="A detailed oil painting of a cityscape",
    image=init_image,
    strength=0.75,       # 0.0 = no change, 1.0 = fully regenerate
    num_inference_steps=30,
).images[0]

result.save("painting.png")
```

### Using FLUX (newer, higher quality)

```python
from diffusers import FluxPipeline
import torch

pipe = FluxPipeline.from_pretrained(
    "black-forest-labs/FLUX.1-schnell",
    torch_dtype=torch.bfloat16,
).to("cuda")

image = pipe(
    prompt="A photo of a cat wearing a tiny astronaut helmet",
    num_inference_steps=4,  # FLUX.1-schnell is fast (4 steps)
    guidance_scale=0.0,
).images[0]

image.save("astro_cat.png")
```

### Schedulers (control generation quality/speed)

```python
from diffusers import DPMSolverMultistepScheduler

# Swap scheduler for faster generation
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
# Now 20 steps ≈ quality of 50 steps with default scheduler
```

---

## 6. Jupyter AI (Phase 5 gap)

Jupyter AI adds AI-powered code generation directly into JupyterLab.

```bash
pip install jupyter-ai
```

### Setup

```python
# In a notebook cell, load the extension
%load_ext jupyter_ai

# Configure your provider (set API key as env var first)
# export ANTHROPIC_API_KEY=sk-...
```

### Magic Commands

```python
# --- %%ai cell magic: generate code from a prompt ---
%%ai anthropic:claude-sonnet-4-20250514
Write a Python function that takes a list of dictionaries and returns
a pandas DataFrame with proper column types inferred.

# --- %ai line magic: quick questions ---
%ai anthropic:claude-sonnet-4-20250514 What does pd.melt() do?

# --- Generate into a new cell ---
%%ai anthropic:claude-sonnet-4-20250514 -f code
Create a matplotlib visualization showing a scatter plot with
a regression line, using seaborn styling.
```

### Chat Interface

JupyterLab 4+ with jupyter-ai provides a **chat sidebar**:

1. Click the chat icon in the left sidebar
2. Select your model (Claude, GPT-4, etc.)
3. Ask questions about your notebook, request code, or get explanations
4. The AI can see your notebook context (cells, variables, outputs)

### Useful Patterns

```python
# Generate documentation for existing code
%%ai anthropic:claude-sonnet-4-20250514 -f markdown
Explain what this function does and add a docstring:

def fn(df, col, n=5):
    return df.nlargest(n, col).reset_index(drop=True)

# Fix errors
%%ai anthropic:claude-sonnet-4-20250514
I'm getting "KeyError: 'price'" when running df.groupby('category')['price'].mean().
My DataFrame columns are: ['category', 'item_price', 'quantity'].
What's wrong and how do I fix it?

# Convert between formats
%%ai anthropic:claude-sonnet-4-20250514 -f code
Convert this pandas code to Polars:
df.groupby('city')['sales'].agg(['mean', 'sum']).reset_index()
```

---

## 7. mamba / miniforge (Phase 2 gap)

For data science workflows that depend on conda packages (CUDA, R, non-Python binaries), use miniforge + mamba instead of Anaconda.

```bash
# Install miniforge (includes mamba by default)
# Download from: https://github.com/conda-forge/miniforge
curl -L -O "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"
bash Miniforge3-$(uname)-$(uname -m).sh

# mamba is a drop-in replacement for conda, but 10-50x faster
mamba create -n ml python=3.13 numpy pandas scikit-learn pytorch
mamba activate ml

# Install packages
mamba install jupyterlab matplotlib seaborn

# Export environment
mamba env export > environment.yml

# Recreate from file
mamba env create -f environment.yml
```

### When to Use mamba vs uv

| Scenario | Use uv | Use mamba/miniforge |
|---|---|---|
| Pure Python packages | Yes | Works but slower |
| CUDA / GPU libs | Possible but tricky | Yes (built-in CUDA support) |
| R packages | No | Yes |
| Non-Python binaries (ffmpeg, etc.) | No | Yes |
| Reproducible Python projects | Yes (`uv.lock`) | Yes (`environment.yml`) |
| Speed | Fastest | Fast (10-50x faster than conda) |
| Data science with heavy native deps | Maybe | Recommended |

**Rule of thumb**: Use `uv` for application development and pure Python projects. Use `mamba` when you need conda-forge packages with native dependencies (especially GPU/CUDA).
