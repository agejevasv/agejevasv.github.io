# Phase 3: Concurrency & Threading in Python

---

## 1. asyncio Fundamentals

### `async def`, `await`, and the Event Loop

The core idea: an event loop runs coroutines cooperatively. When a coroutine hits `await`, it yields control back to the loop, letting other coroutines run.

```python
import asyncio

async def greet(name: str, delay: float) -> str:
    """A coroutine — calling it returns a coroutine object, not a result."""
    print(f"[{name}] Starting...")
    await asyncio.sleep(delay)  # yields control to the event loop
    print(f"[{name}] Done after {delay}s")
    return f"Hello from {name}"

async def main():
    # These run SEQUENTIALLY — each await blocks until complete
    result1 = await greet("Alice", 1.0)
    result2 = await greet("Bob", 0.5)
    print(result1, result2)

asyncio.run(main())
# Output:
# [Alice] Starting...
# [Alice] Done after 1.0s
# [Bob] Starting...
# [Bob] Done after 0.5s
# Hello from Alice Hello from Bob
# Total time: ~1.5s (sequential)
```

### `asyncio.run()` — The Entry Point

`asyncio.run()` creates an event loop, runs the coroutine, and cleans up. Use it exactly once at the top level.

```python
import asyncio

async def main():
    print("Running")
    return 42

# This is the standard entry point — do NOT call it inside an already-running loop
result = asyncio.run(main())
print(result)  # 42
```

### Coroutines vs Tasks vs Futures

```python
import asyncio

async def do_work(n: int) -> int:
    await asyncio.sleep(0.1)
    return n * 2

async def main():
    # 1. Coroutine object — not yet scheduled
    coro = do_work(5)
    print(type(coro))  # <class 'coroutine'>

    # 2. Task — scheduled on the event loop, starts running immediately
    task = asyncio.create_task(do_work(10))
    print(type(task))  # <class 'asyncio.Task'>

    # 3. Future — low-level, rarely used directly
    loop = asyncio.get_running_loop()
    future = loop.create_future()
    future.set_result(99)
    print(type(future))  # <class 'asyncio.Future'>

    # Await them
    result_coro = await coro       # 10
    result_task = await task       # 20
    result_future = await future   # 99
    print(result_coro, result_task, result_future)

asyncio.run(main())
```

Key distinctions:
- **Coroutine**: a function defined with `async def`. Calling it returns a coroutine object that does nothing until awaited or wrapped in a task.
- **Task**: wraps a coroutine and schedules it on the loop. It starts running as soon as the loop has a chance.
- **Future**: a low-level container for a result that will exist in the future. Tasks inherit from Future.

### `asyncio.create_task()` — Concurrent Execution

```python
import asyncio
import time

async def fetch_data(source: str, delay: float) -> str:
    print(f"  Fetching from {source}...")
    await asyncio.sleep(delay)
    return f"Data from {source}"

async def main():
    start = time.perf_counter()

    # Create tasks — they start running concurrently
    task_a = asyncio.create_task(fetch_data("API", 2.0))
    task_b = asyncio.create_task(fetch_data("Database", 1.0))
    task_c = asyncio.create_task(fetch_data("Cache", 0.5))

    # Await all results
    result_a = await task_a
    result_b = await task_b
    result_c = await task_c

    elapsed = time.perf_counter() - start
    print(f"Results: {result_a}, {result_b}, {result_c}")
    print(f"Total time: {elapsed:.1f}s")  # ~2.0s, NOT 3.5s

asyncio.run(main())
```

### `asyncio.sleep()` vs `time.sleep()` — Why It Matters

```python
import asyncio
import time

async def bad_sleep():
    """BLOCKS the entire event loop — nothing else can run."""
    print("bad_sleep: blocking...")
    time.sleep(2)  # BAD — this is synchronous
    print("bad_sleep: done")

async def good_sleep():
    """Yields to the event loop — other tasks can run."""
    print("good_sleep: yielding...")
    await asyncio.sleep(2)  # GOOD — cooperative
    print("good_sleep: done")

async def background():
    for i in range(5):
        print(f"  background tick {i}")
        await asyncio.sleep(0.5)

async def demo_bad():
    print("=== BAD: time.sleep blocks everything ===")
    t1 = asyncio.create_task(bad_sleep())
    t2 = asyncio.create_task(background())
    await t1
    await t2

async def demo_good():
    print("\n=== GOOD: asyncio.sleep lets others run ===")
    t1 = asyncio.create_task(good_sleep())
    t2 = asyncio.create_task(background())
    await t1
    await t2

asyncio.run(demo_bad())
# background ticks only run AFTER bad_sleep finishes

asyncio.run(demo_good())
# background ticks interleave with good_sleep
```

---

## 2. asyncio.TaskGroup (Python 3.11+)

### Why TaskGroup Replaces `asyncio.gather()`

`asyncio.gather()` has problems: if one task fails, other tasks keep running. Exceptions can be lost. Cleanup is messy. `TaskGroup` fixes all of this with structured concurrency.

```python
import asyncio

# OLD way — gather
async def old_way():
    results = await asyncio.gather(
        fetch("url1"),
        fetch("url2"),
        fetch("url3"),
    )
    return results

# NEW way — TaskGroup (3.11+)
async def new_way():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch("url1"))
        task2 = tg.create_task(fetch("url2"))
        task3 = tg.create_task(fetch("url3"))
    # All tasks guaranteed complete when we exit the `async with`
    return task1.result(), task2.result(), task3.result()
```

### Structured Concurrency Concept

The principle: tasks never outlive their scope. When the `async with` block exits, every task inside is either done or cancelled.

```python
import asyncio
import random

async def process_item(item: str) -> str:
    delay = random.uniform(0.1, 1.0)
    await asyncio.sleep(delay)
    return f"Processed {item} in {delay:.2f}s"

async def main():
    items = [f"item_{i}" for i in range(6)]
    results: list[asyncio.Task] = []

    async with asyncio.TaskGroup() as tg:
        for item in items:
            task = tg.create_task(process_item(item))
            results.append(task)
    # This line only runs when ALL tasks have completed
    for t in results:
        print(t.result())

asyncio.run(main())
```

### Error Handling with TaskGroup

If any task raises, the TaskGroup cancels all remaining tasks and raises an `ExceptionGroup`.

```python
import asyncio

async def succeed(name: str) -> str:
    await asyncio.sleep(0.5)
    print(f"  {name} succeeded")
    return f"{name} OK"

async def fail(name: str) -> str:
    await asyncio.sleep(0.2)
    raise ValueError(f"{name} broke!")

async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(succeed("A"))
            tg.create_task(fail("B"))
            tg.create_task(succeed("C"))
    except* ValueError as eg:
        # except* catches ExceptionGroup — new syntax in 3.11
        print(f"Caught {len(eg.exceptions)} error(s):")
        for exc in eg.exceptions:
            print(f"  - {exc}")

asyncio.run(main())
# Output:
#   B broke! (after 0.2s, A and C get cancelled)
#   Caught 1 error(s):
#   - B broke!
```

### Real Examples

#### Example 1: Fan-out / Fan-in — Fetching Multiple URLs

```python
import asyncio
import time

async def fetch_url(url: str) -> dict:
    """Simulate an HTTP fetch."""
    delay = len(url) * 0.05  # fake variable latency
    await asyncio.sleep(delay)
    return {"url": url, "status": 200, "size": len(url) * 100}

async def main():
    urls = [
        "https://example.com/api/users",
        "https://example.com/api/products",
        "https://example.com/api/orders",
        "https://example.com/api/inventory",
        "https://example.com/api/analytics",
    ]

    start = time.perf_counter()
    tasks: list[asyncio.Task] = []

    async with asyncio.TaskGroup() as tg:
        for url in urls:
            tasks.append(tg.create_task(fetch_url(url)))

    # Fan-in: collect all results
    results = [t.result() for t in tasks]
    elapsed = time.perf_counter() - start

    for r in results:
        print(f"  {r['url']} -> {r['status']} ({r['size']} bytes)")
    print(f"Total time: {elapsed:.2f}s (concurrent)")

asyncio.run(main())
```

#### Example 2: Processing Pipeline with Progress

```python
import asyncio

async def download(item_id: int) -> bytes:
    await asyncio.sleep(0.3)
    return f"raw_data_{item_id}".encode()

async def transform(data: bytes) -> str:
    await asyncio.sleep(0.1)
    return data.decode().upper()

async def save(result: str) -> str:
    await asyncio.sleep(0.1)
    return f"Saved: {result}"

async def pipeline(item_id: int) -> str:
    """Full pipeline for one item."""
    data = await download(item_id)
    transformed = await transform(data)
    return await save(transformed)

async def main():
    item_ids = list(range(10))
    tasks: list[asyncio.Task] = []

    async with asyncio.TaskGroup() as tg:
        for item_id in item_ids:
            tasks.append(tg.create_task(pipeline(item_id)))

    for t in tasks:
        print(t.result())

asyncio.run(main())
# All 10 pipelines run concurrently — total ~0.5s, not 5.0s
```

#### Example 3: TaskGroup with Dynamic Task Creation

```python
import asyncio
import random

async def discover_subtasks(category: str) -> list[str]:
    await asyncio.sleep(0.1)
    count = random.randint(1, 4)
    return [f"{category}_job_{i}" for i in range(count)]

async def execute_job(job: str) -> str:
    delay = random.uniform(0.1, 0.5)
    await asyncio.sleep(delay)
    return f"Completed {job}"

async def main():
    categories = ["images", "videos", "documents"]
    all_results: list[str] = []

    # Phase 1: discover work
    discovery_tasks: list[asyncio.Task] = []
    async with asyncio.TaskGroup() as tg:
        for cat in categories:
            discovery_tasks.append(tg.create_task(discover_subtasks(cat)))

    all_jobs = []
    for t in discovery_tasks:
        all_jobs.extend(t.result())
    print(f"Discovered {len(all_jobs)} jobs: {all_jobs}")

    # Phase 2: execute all discovered work
    exec_tasks: list[asyncio.Task] = []
    async with asyncio.TaskGroup() as tg:
        for job in all_jobs:
            exec_tasks.append(tg.create_task(execute_job(job)))

    for t in exec_tasks:
        print(f"  {t.result()}")

asyncio.run(main())
```

---

## 3. `asyncio.to_thread()` — Bridging Sync and Async

### When to Use It

You have blocking (synchronous) code — file I/O, CPU work, a library that is not async — and you need to call it from async code without freezing the event loop.

```python
import asyncio
import time

def blocking_io_operation(filename: str) -> str:
    """Simulates a slow synchronous I/O operation."""
    time.sleep(1)  # blocking!
    return f"Contents of {filename}"

async def main():
    # BAD — blocks the event loop for 3 seconds total
    # result1 = blocking_io_operation("a.txt")
    # result2 = blocking_io_operation("b.txt")
    # result3 = blocking_io_operation("c.txt")

    # GOOD — runs each in a thread, concurrently
    start = time.perf_counter()
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(asyncio.to_thread(blocking_io_operation, "a.txt"))
        t2 = tg.create_task(asyncio.to_thread(blocking_io_operation, "b.txt"))
        t3 = tg.create_task(asyncio.to_thread(blocking_io_operation, "c.txt"))

    print(t1.result(), t2.result(), t3.result())
    print(f"Elapsed: {time.perf_counter() - start:.1f}s")  # ~1.0s, not 3.0s

asyncio.run(main())
```

### Real Example: Reading Files from Async Code

```python
import asyncio
from pathlib import Path

def read_file_sync(path: str) -> str:
    """Regular synchronous file read."""
    return Path(path).read_text()

def write_file_sync(path: str, content: str) -> None:
    Path(path).write_text(content)

async def process_files(paths: list[str]) -> list[str]:
    async with asyncio.TaskGroup() as tg:
        tasks = [
            tg.create_task(asyncio.to_thread(read_file_sync, p))
            for p in paths
        ]
    return [t.result() for t in tasks]

async def main():
    # Set up test files
    for i in range(5):
        await asyncio.to_thread(write_file_sync, f"/tmp/test_{i}.txt", f"Content {i}")

    paths = [f"/tmp/test_{i}.txt" for i in range(5)]
    results = await process_files(paths)
    for path, content in zip(paths, results):
        print(f"  {path}: {content}")

asyncio.run(main())
```

### `to_thread()` vs `run_in_executor()`

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

def slow_func(x: int) -> int:
    import time
    time.sleep(0.5)
    return x * 2

async def main():
    # Modern way (3.9+) — simple, uses default executor
    result1 = await asyncio.to_thread(slow_func, 21)
    print(result1)  # 42

    # Old way — more control but more verbose
    loop = asyncio.get_running_loop()
    with ThreadPoolExecutor(max_workers=4) as pool:
        result2 = await loop.run_in_executor(pool, slow_func, 21)
    print(result2)  # 42

    # Use run_in_executor when you need:
    # - A custom executor (specific thread/process pool)
    # - ProcessPoolExecutor (to_thread only does threads)
    # - Control over pool size

asyncio.run(main())
```

---

## 4. concurrent.futures

### ThreadPoolExecutor — I/O-Bound Parallelism

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import urllib.request

def fetch_url(url: str) -> tuple[str, int]:
    """Synchronous URL fetch."""
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            data = response.read()
            return url, len(data)
    except Exception as e:
        return url, -1

def main():
    urls = [
        "https://httpbin.org/get",
        "https://httpbin.org/ip",
        "https://httpbin.org/user-agent",
        "https://httpbin.org/headers",
    ]

    start = time.perf_counter()

    # executor.map() — ordered results, simple
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(fetch_url, urls))

    for url, size in results:
        print(f"  {url}: {size} bytes")
    print(f"map() took {time.perf_counter() - start:.2f}s")

main()
```

### `submit()` and `as_completed()` — Results as They Arrive

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import random

def process_job(job_id: int) -> dict:
    delay = random.uniform(0.1, 2.0)
    time.sleep(delay)
    return {"job_id": job_id, "delay": delay, "result": job_id ** 2}

def main():
    start = time.perf_counter()

    with ThreadPoolExecutor(max_workers=5) as executor:
        # submit() returns a Future immediately
        future_to_id = {
            executor.submit(process_job, i): i
            for i in range(10)
        }

        # as_completed() yields futures as they finish — NOT in submission order
        for future in as_completed(future_to_id):
            job_id = future_to_id[future]
            try:
                result = future.result()  # raises if the callable raised
                elapsed = time.perf_counter() - start
                print(f"  [{elapsed:.2f}s] Job {result['job_id']} "
                      f"finished (took {result['delay']:.2f}s)")
            except Exception as e:
                print(f"  Job {job_id} failed: {e}")

    print(f"Total: {time.perf_counter() - start:.2f}s")

main()
```

### ProcessPoolExecutor — CPU-Bound Parallelism

```python
from concurrent.futures import ProcessPoolExecutor
import time
import math

def cpu_heavy(n: int) -> tuple[int, float]:
    """CPU-intensive computation."""
    start = time.perf_counter()
    # Calculate sum of primes up to n
    total = 0
    for num in range(2, n):
        if all(num % i != 0 for i in range(2, int(math.sqrt(num)) + 1)):
            total += num
    return n, time.perf_counter() - start

def main():
    inputs = [100_000, 200_000, 150_000, 120_000]

    # Sequential
    start = time.perf_counter()
    seq_results = [cpu_heavy(n) for n in inputs]
    seq_time = time.perf_counter() - start
    print(f"Sequential: {seq_time:.2f}s")

    # Parallel with processes (bypasses GIL)
    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=4) as executor:
        par_results = list(executor.map(cpu_heavy, inputs))
    par_time = time.perf_counter() - start
    print(f"Parallel:   {par_time:.2f}s")
    print(f"Speedup:    {seq_time / par_time:.1f}x")

    for n, elapsed in par_results:
        print(f"  n={n}: {elapsed:.2f}s")

if __name__ == "__main__":
    main()
```

### Quick Reference: map vs submit

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def double(x):
    return x * 2

with ThreadPoolExecutor(max_workers=3) as ex:
    # map() — simple, ordered results, one iterable of args
    results = list(ex.map(double, [1, 2, 3, 4, 5]))
    print(results)  # [2, 4, 6, 8, 10]

    # submit() — flexible, returns futures, supports kwargs
    futures = [ex.submit(double, x) for x in [1, 2, 3, 4, 5]]

    # Get results in completion order
    for f in as_completed(futures):
        print(f.result())  # any order

    # Get results in submission order
    results_ordered = [f.result() for f in futures]
    print(results_ordered)  # [2, 4, 6, 8, 10]
```

---

## 5. GIL Status in 2026

### What the GIL Is and Why It Matters

The **Global Interpreter Lock (GIL)** is a mutex in CPython that allows only one thread to execute Python bytecode at a time. This means:

- **Threads work for I/O**: while one thread waits on network/disk, another can run.
- **Threads do NOT help for CPU work**: two threads doing math cannot run in parallel — one always waits for the GIL.

```python
import threading
import time

counter = 0

def increment(n: int):
    global counter
    for _ in range(n):
        counter += 1  # NOT thread-safe even with the GIL

def demo_gil_problem():
    """Shows that threads don't speed up CPU work (with GIL)."""
    global counter

    # Single-threaded
    counter = 0
    start = time.perf_counter()
    increment(10_000_000)
    single = time.perf_counter() - start
    print(f"Single-threaded: {single:.2f}s, counter={counter}")

    # Multi-threaded — same or SLOWER due to GIL contention
    counter = 0
    start = time.perf_counter()
    threads = [threading.Thread(target=increment, args=(5_000_000,)) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    multi = time.perf_counter() - start
    # counter may be WRONG due to race condition (increment is not atomic)
    print(f"Multi-threaded:  {multi:.2f}s, counter={counter} (expected 10000000)")

demo_gil_problem()
```

### Free-Threaded Mode (PEP 703)

Python 3.13 introduced experimental free-threaded (no-GIL) builds. In 3.14+ it is more stable but still opt-in.

**How to try it:**

```bash
# Install free-threaded Python (varies by platform)
# On Ubuntu/Debian:
sudo apt install python3.14-nogil  # if available

# Or build from source:
# ./configure --disable-gil && make && make install

# Or use pyenv:
# pyenv install 3.14t  # 't' suffix = free-threaded build

# Run with GIL disabled:
python3.14t -X gil=0 your_script.py

# Check at runtime:
python3.14t -c "import sys; print(sys._is_gil_enabled())"
```

**What changes for your code:**

```python
import sys
import threading
import time

def check_gil():
    """Check whether the GIL is active."""
    if hasattr(sys, "_is_gil_enabled"):
        enabled = sys._is_gil_enabled()
        print(f"GIL enabled: {enabled}")
    else:
        print("GIL status API not available (Python < 3.13)")

def cpu_work(n: int) -> int:
    total = 0
    for i in range(n):
        total += i * i
    return total

def benchmark_threads():
    """This will show real speedup ONLY in free-threaded mode."""
    n = 5_000_000

    # Sequential
    start = time.perf_counter()
    cpu_work(n)
    cpu_work(n)
    seq_time = time.perf_counter() - start

    # Threaded
    start = time.perf_counter()
    t1 = threading.Thread(target=cpu_work, args=(n,))
    t2 = threading.Thread(target=cpu_work, args=(n,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    thr_time = time.perf_counter() - start

    print(f"Sequential: {seq_time:.2f}s")
    print(f"Threaded:   {thr_time:.2f}s")
    print(f"Speedup:    {seq_time / thr_time:.2f}x")
    # With GIL:    speedup ~1.0x (no benefit)
    # Without GIL: speedup ~1.8-2.0x on 2 cores

check_gil()
benchmark_threads()
```

**Key things to know in 2026:**

1. Free-threaded builds are available via `python3.Xt` (the `t` suffix).
2. Most major libraries (NumPy, etc.) have added free-threaded support.
3. You must still use proper synchronization (locks, etc.) — removing the GIL means real data races are possible.
4. For new projects: `asyncio` is still the default for I/O concurrency. Free-threaded mode is a win for CPU-bound threading.

---

## 6. Practical Project: Async Web Scraper

A complete, working scraper using `httpx` and `asyncio.TaskGroup`.

```python
"""
Async web scraper with rate limiting and error handling.
Install: pip install httpx
"""
import asyncio
import httpx
import time
from dataclasses import dataclass, field

# --- Data Models ---

@dataclass
class ScrapeResult:
    url: str
    status: int
    size: int
    elapsed: float
    error: str | None = None

@dataclass
class ScrapeReport:
    results: list[ScrapeResult] = field(default_factory=list)
    total_time: float = 0.0

    def summary(self) -> str:
        ok = sum(1 for r in self.results if r.error is None)
        failed = len(self.results) - ok
        total_bytes = sum(r.size for r in self.results)
        lines = [
            f"Scraped {len(self.results)} URLs in {self.total_time:.2f}s",
            f"  Succeeded: {ok}",
            f"  Failed:    {failed}",
            f"  Total data: {total_bytes:,} bytes",
        ]
        return "\n".join(lines)

# --- Scraper ---

class AsyncScraper:
    def __init__(
        self,
        max_concurrent: int = 5,
        timeout: float = 10.0,
        retries: int = 2,
    ):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.timeout = timeout
        self.retries = retries

    async def fetch_one(
        self, client: httpx.AsyncClient, url: str
    ) -> ScrapeResult:
        """Fetch a single URL with rate limiting and retries."""
        async with self.semaphore:  # limits concurrent requests
            last_error = None
            for attempt in range(1, self.retries + 1):
                start = time.perf_counter()
                try:
                    response = await client.get(
                        url, timeout=self.timeout, follow_redirects=True
                    )
                    elapsed = time.perf_counter() - start
                    return ScrapeResult(
                        url=url,
                        status=response.status_code,
                        size=len(response.content),
                        elapsed=elapsed,
                    )
                except httpx.TimeoutException:
                    last_error = f"Timeout (attempt {attempt}/{self.retries})"
                except httpx.HTTPStatusError as e:
                    last_error = f"HTTP {e.response.status_code}"
                except httpx.RequestError as e:
                    last_error = f"{type(e).__name__}: {e}"

                # Back off before retry
                if attempt < self.retries:
                    await asyncio.sleep(0.5 * attempt)

            elapsed = time.perf_counter() - start
            return ScrapeResult(
                url=url, status=0, size=0, elapsed=elapsed, error=last_error
            )

    async def scrape(self, urls: list[str]) -> ScrapeReport:
        """Scrape all URLs concurrently with TaskGroup."""
        report = ScrapeReport()
        start = time.perf_counter()

        async with httpx.AsyncClient(
            headers={"User-Agent": "AsyncScraper/1.0"}
        ) as client:
            tasks: list[asyncio.Task[ScrapeResult]] = []

            async with asyncio.TaskGroup() as tg:
                for url in urls:
                    task = tg.create_task(self.fetch_one(client, url))
                    tasks.append(task)

            report.results = [t.result() for t in tasks]

        report.total_time = time.perf_counter() - start
        return report

# --- Main ---

async def main():
    urls = [
        "https://httpbin.org/get",
        "https://httpbin.org/ip",
        "https://httpbin.org/user-agent",
        "https://httpbin.org/headers",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/status/200",
        "https://httpbin.org/status/404",
        "https://httpbin.org/html",
        "https://httpbin.org/json",
        "https://httpbin.org/xml",
    ]

    scraper = AsyncScraper(max_concurrent=3, timeout=5.0, retries=2)
    report = await scraper.scrape(urls)

    print(report.summary())
    print("\nDetails:")
    for r in report.results:
        status = f"ERR: {r.error}" if r.error else f"{r.status}"
        print(f"  [{r.elapsed:.2f}s] {status:>10s}  {r.size:>8,} bytes  {r.url}")

if __name__ == "__main__":
    asyncio.run(main())
```

### How the Semaphore Works

```python
import asyncio
import time

async def rate_limited_task(sem: asyncio.Semaphore, task_id: int):
    async with sem:  # blocks if 3 tasks already running
        print(f"  [{time.perf_counter():.1f}] Task {task_id} START")
        await asyncio.sleep(1.0)
        print(f"  [{time.perf_counter():.1f}] Task {task_id} END")

async def main():
    sem = asyncio.Semaphore(3)  # max 3 concurrent

    async with asyncio.TaskGroup() as tg:
        for i in range(9):
            tg.create_task(rate_limited_task(sem, i))

    # You'll see tasks run in batches of 3

asyncio.run(main())
```

---

## 7. asyncio.Queue — Producer/Consumer Patterns

`asyncio.Queue` is how you pass data between concurrent tasks. It decouples producers (who create work) from consumers (who process it).

### Basics: `put()`, `get()`, `join()`, `task_done()`

```python
import asyncio

async def main():
    q: asyncio.Queue[str] = asyncio.Queue()

    # put() adds an item
    await q.put("item_1")
    await q.put("item_2")
    print(f"Queue size: {q.qsize()}")  # 2

    # get() removes and returns an item (FIFO)
    item = await q.get()
    print(f"Got: {item}")  # item_1

    # task_done() signals that a formerly-enqueued item has been fully processed.
    # join() blocks until every item that was put() has a matching task_done().
    q.task_done()

    # One item remains
    item2 = await q.get()
    q.task_done()

    # join() returns immediately because all items have been marked done
    await q.join()
    print("All work complete")

asyncio.run(main())
```

### Producer/Consumer with TaskGroup

The canonical pattern: producers add work to a queue, consumers pull from it. `join()` + `task_done()` lets you know when everything is processed.

```python
import asyncio
import random

async def producer(name: str, queue: asyncio.Queue[str], num_items: int):
    """Produce items and put them on the queue."""
    for i in range(num_items):
        item = f"{name}-item-{i}"
        await asyncio.sleep(random.uniform(0.01, 0.1))  # simulate work
        await queue.put(item)
        print(f"  [producer {name}] put {item}")
    print(f"  [producer {name}] done producing")

async def consumer(name: str, queue: asyncio.Queue[str]):
    """Consume items from the queue until cancelled."""
    while True:
        item = await queue.get()  # blocks until an item is available
        try:
            await asyncio.sleep(random.uniform(0.05, 0.15))  # simulate processing
            print(f"  [consumer {name}] processed {item}")
        finally:
            queue.task_done()  # MUST call this, even if processing fails

async def main():
    queue: asyncio.Queue[str] = asyncio.Queue()

    # Start producers and consumers concurrently
    async with asyncio.TaskGroup() as tg:
        # 3 producers, each producing 4 items = 12 items total
        tg.create_task(producer("P1", queue, 4))
        tg.create_task(producer("P2", queue, 4))
        tg.create_task(producer("P3", queue, 4))

        # 2 consumers
        consumer_tasks = [
            tg.create_task(consumer("C1", queue)),
            tg.create_task(consumer("C2", queue)),
        ]

        # Wait until every item has been processed
        await queue.join()
        print("All items processed!")

        # Cancel consumers (they are in an infinite loop waiting for more work)
        for t in consumer_tasks:
            t.cancel()

asyncio.run(main())
# Output: 12 items produced and processed by 2 consumers, then "All items processed!"
```

Key points:
- Consumers run an infinite `while True` loop — they keep pulling items until cancelled.
- `queue.join()` blocks until every `put()` has a matching `task_done()`.
- After `join()` returns, cancel the consumers since there is no more work.

### Bounded Queue (Backpressure)

`asyncio.Queue(maxsize=N)` blocks `put()` when the queue is full. This prevents fast producers from overwhelming slow consumers.

```python
import asyncio
import time

async def fast_producer(queue: asyncio.Queue[int]):
    """Produces items much faster than the consumer can handle."""
    for i in range(20):
        start = time.perf_counter()
        await queue.put(i)  # blocks when queue is full
        wait = time.perf_counter() - start
        if wait > 0.01:
            print(f"  producer blocked for {wait:.2f}s on item {i} (backpressure)")

async def slow_consumer(queue: asyncio.Queue[int]):
    """Processes items slowly."""
    while True:
        item = await queue.get()
        try:
            await asyncio.sleep(0.2)  # slow processing
            print(f"  consumed {item}")
        finally:
            queue.task_done()

async def main():
    # maxsize=3 means only 3 items can be buffered at a time
    queue: asyncio.Queue[int] = asyncio.Queue(maxsize=3)

    async with asyncio.TaskGroup() as tg:
        tg.create_task(fast_producer(queue))
        consumer_task = tg.create_task(slow_consumer(queue))

        await queue.join()
        consumer_task.cancel()

asyncio.run(main())
# The producer is forced to slow down to match the consumer's pace
```

### Priority Queue

`asyncio.PriorityQueue` dequeues the lowest-value item first. Items must be comparable (tuples work well).

```python
import asyncio

async def main():
    pq: asyncio.PriorityQueue[tuple[int, str]] = asyncio.PriorityQueue()

    # Lower number = higher priority
    await pq.put((3, "low priority task"))
    await pq.put((1, "urgent task"))
    await pq.put((2, "normal task"))

    while not pq.empty():
        priority, task = await pq.get()
        print(f"  [{priority}] {task}")
        pq.task_done()

asyncio.run(main())
# Output:
#   [1] urgent task
#   [2] normal task
#   [3] low priority task
```

### Queue vs Semaphore — When to Use Which

They solve different problems:

- **Queue**: passes data between tasks (producer/consumer). Controls *what* gets processed.
- **Semaphore**: limits how many tasks access a resource concurrently. Controls *how many* run at once.

```python
import asyncio
import time

# --- Semaphore: rate-limit access to an API ---

async def fetch_with_semaphore(sem: asyncio.Semaphore, url: str):
    async with sem:  # at most 3 concurrent requests
        print(f"  fetching {url}")
        await asyncio.sleep(0.5)
        return f"data from {url}"

async def demo_semaphore():
    sem = asyncio.Semaphore(3)
    urls = [f"https://api.example.com/{i}" for i in range(9)]

    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch_with_semaphore(sem, u)) for u in urls]

    results = [t.result() for t in tasks]
    print(f"  Got {len(results)} results")

# --- Queue: distribute work items to a pool of workers ---

async def worker(name: str, queue: asyncio.Queue[str]):
    while True:
        url = await queue.get()
        try:
            print(f"  [{name}] processing {url}")
            await asyncio.sleep(0.5)
        finally:
            queue.task_done()

async def demo_queue():
    queue: asyncio.Queue[str] = asyncio.Queue()
    urls = [f"https://api.example.com/{i}" for i in range(9)]

    # Enqueue all work
    for url in urls:
        await queue.put(url)

    # 3 workers consume from the queue
    async with asyncio.TaskGroup() as tg:
        workers = [tg.create_task(worker(f"W{i}", queue)) for i in range(3)]
        await queue.join()
        for w in workers:
            w.cancel()

asyncio.run(demo_semaphore())
asyncio.run(demo_queue())

# Both process 9 URLs with concurrency=3, but:
# - Semaphore: each task knows its own URL. Good when you already have all tasks.
# - Queue: workers are generic. Good when work arrives dynamically or you want
#   to decouple producers from consumers.
```

---

## 8. Decision Tree: asyncio vs Threads vs Processes

### The Rule

| Workload Type | Best Tool | Why |
|---|---|---|
| I/O-bound, async libs available | `asyncio` + `TaskGroup` | Lowest overhead, scales to thousands |
| I/O-bound, sync-only libs | `ThreadPoolExecutor` or `asyncio.to_thread()` | Threads release GIL during I/O |
| CPU-bound | `ProcessPoolExecutor` | Separate processes bypass GIL |
| CPU-bound, free-threaded Python | Threads or processes | GIL removed, threads work |

### Benchmark: I/O-Bound Work

```python
"""Compare asyncio vs threads vs sequential for I/O-bound work."""
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

N_TASKS = 50
IO_DELAY = 0.1  # simulated I/O latency per task

# --- Sequential ---
def sequential():
    for _ in range(N_TASKS):
        time.sleep(IO_DELAY)

# --- Threaded ---
def threaded():
    def task():
        time.sleep(IO_DELAY)
    with ThreadPoolExecutor(max_workers=20) as ex:
        list(ex.map(lambda _: task(), range(N_TASKS)))

# --- Async ---
async def async_version():
    async def task():
        await asyncio.sleep(IO_DELAY)
    async with asyncio.TaskGroup() as tg:
        for _ in range(N_TASKS):
            tg.create_task(task())

def benchmark():
    # Sequential
    start = time.perf_counter()
    sequential()
    seq = time.perf_counter() - start

    # Threaded
    start = time.perf_counter()
    threaded()
    thr = time.perf_counter() - start

    # Async
    start = time.perf_counter()
    asyncio.run(async_version())
    aio = time.perf_counter() - start

    print(f"I/O-bound benchmark ({N_TASKS} tasks, {IO_DELAY}s each):")
    print(f"  Sequential: {seq:.2f}s")
    print(f"  Threaded:   {thr:.2f}s  ({seq/thr:.1f}x faster)")
    print(f"  Async:      {aio:.2f}s  ({seq/aio:.1f}x faster)")

benchmark()
# Typical output:
#   Sequential: 5.02s
#   Threaded:   0.31s  (16.2x faster)
#   Async:      0.11s  (45.6x faster)
```

### Benchmark: CPU-Bound Work

```python
"""Compare threads vs processes for CPU-bound work."""
import time
import math
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

def count_primes(limit: int) -> int:
    return sum(1 for n in range(2, limit) if is_prime(n))

def benchmark_cpu():
    inputs = [500_000] * 4  # 4 identical CPU-heavy tasks

    # Sequential
    start = time.perf_counter()
    results_seq = [count_primes(n) for n in inputs]
    seq = time.perf_counter() - start

    # Threaded (GIL limits benefit)
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=4) as ex:
        results_thr = list(ex.map(count_primes, inputs))
    thr = time.perf_counter() - start

    # Processes (real parallelism)
    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=4) as ex:
        results_proc = list(ex.map(count_primes, inputs))
    proc = time.perf_counter() - start

    print(f"CPU-bound benchmark (4 tasks):")
    print(f"  Sequential: {seq:.2f}s")
    print(f"  Threaded:   {thr:.2f}s  ({seq/thr:.1f}x)")
    print(f"  Processes:  {proc:.2f}s  ({seq/proc:.1f}x)")
    # Typical:
    #   Sequential: 4.0s
    #   Threaded:   4.1s  (1.0x — GIL blocks parallelism)
    #   Processes:  1.2s  (3.3x — real parallelism)

if __name__ == "__main__":
    benchmark_cpu()
```

### Decision Flowchart (as Code)

```python
def choose_concurrency(
    is_io_bound: bool,
    async_libs_available: bool,
    needs_shared_memory: bool,
) -> str:
    if is_io_bound:
        if async_libs_available:
            return "asyncio.TaskGroup + async/await"
        else:
            return "ThreadPoolExecutor (or asyncio.to_thread to bridge)"
    else:
        # CPU-bound
        if needs_shared_memory:
            return "threading + free-threaded Python (3.13t+), or multiprocessing.shared_memory"
        else:
            return "ProcessPoolExecutor"

# Examples
print(choose_concurrency(is_io_bound=True, async_libs_available=True, needs_shared_memory=False))
# -> asyncio.TaskGroup + async/await

print(choose_concurrency(is_io_bound=True, async_libs_available=False, needs_shared_memory=False))
# -> ThreadPoolExecutor

print(choose_concurrency(is_io_bound=False, async_libs_available=False, needs_shared_memory=False))
# -> ProcessPoolExecutor
```

---

## 9. Common Pitfalls

### Pitfall 1: Blocking the Event Loop

```python
import asyncio
import time

async def bad_handler(request_id: int):
    """WRONG — blocks the entire event loop."""
    time.sleep(2)  # all other coroutines freeze!
    return f"Response {request_id}"

async def good_handler(request_id: int):
    """RIGHT — use to_thread for blocking calls."""
    result = await asyncio.to_thread(time.sleep, 2)
    return f"Response {request_id}"

# Detecting blocking: use asyncio's debug mode
async def main():
    # Enable slow-callback warnings (default threshold: 100ms)
    import logging
    logging.basicConfig(level=logging.WARNING)

    loop = asyncio.get_running_loop()
    loop.slow_callback_duration = 0.05  # warn if anything blocks > 50ms

    # This will trigger a warning:
    await bad_handler(1)

asyncio.run(main(), debug=True)
```

### Pitfall 2: Forgetting `await`

```python
import asyncio

async def fetch_data():
    await asyncio.sleep(0.1)
    return {"data": 42}

async def main():
    # WRONG — this returns a coroutine object, not the result
    result = fetch_data()
    print(type(result))  # <class 'coroutine'>
    # Python will warn: "RuntimeWarning: coroutine 'fetch_data' was never awaited"

    # RIGHT
    result = await fetch_data()
    print(result)  # {'data': 42}

asyncio.run(main())
```

### Pitfall 3: Fire-and-Forget Tasks Disappearing

```python
import asyncio

async def background_work():
    await asyncio.sleep(1)
    print("Background done!")

async def main_bad():
    # BAD — task can be garbage collected before it finishes
    asyncio.create_task(background_work())
    # main exits, task gets cancelled silently

async def main_good():
    # GOOD — keep a reference and await it
    task = asyncio.create_task(background_work())
    await task  # ensures completion

    # BETTER — use TaskGroup
    async with asyncio.TaskGroup() as tg:
        tg.create_task(background_work())
    # guaranteed complete

asyncio.run(main_bad())   # "Background done!" may never print
asyncio.run(main_good())  # always prints
```

### Pitfall 4: Task Cancellation

```python
import asyncio

async def long_running():
    try:
        print("Starting long task...")
        await asyncio.sleep(10)
        print("Finished!")  # never reached if cancelled
    except asyncio.CancelledError:
        print("Task was cancelled! Cleaning up...")
        # Do cleanup here (close files, connections, etc.)
        raise  # IMPORTANT: re-raise so the cancellation propagates

async def main():
    task = asyncio.create_task(long_running())

    await asyncio.sleep(0.5)
    task.cancel()  # request cancellation

    try:
        await task
    except asyncio.CancelledError:
        print("Confirmed: task is cancelled")

asyncio.run(main())
# Output:
#   Starting long task...
#   Task was cancelled! Cleaning up...
#   Confirmed: task is cancelled
```

### Pitfall 5: Exception Handling in Concurrent Code

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- asyncio: exceptions in tasks are silent until awaited ---

async def failing_task():
    raise ValueError("boom")

async def demo_lost_exception():
    task = asyncio.create_task(failing_task())
    await asyncio.sleep(1)
    # If you never await `task`, the exception is lost (with a warning)
    # ALWAYS await your tasks or use TaskGroup

async def demo_taskgroup_catches_all():
    """TaskGroup catches everything — no lost exceptions."""
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(failing_task())
            tg.create_task(failing_task())
    except* ValueError as eg:
        print(f"Caught {len(eg.exceptions)} exceptions")
        for e in eg.exceptions:
            print(f"  {e}")

asyncio.run(demo_taskgroup_catches_all())

# --- concurrent.futures: check future.result() ---

def might_fail(x: int) -> int:
    if x == 3:
        raise RuntimeError(f"Bad value: {x}")
    return x * 2

def demo_futures_exceptions():
    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(might_fail, i): i for i in range(5)}

        for future in as_completed(futures):
            original_input = futures[future]
            try:
                result = future.result()  # raises if the callable raised
                print(f"  Input {original_input} -> {result}")
            except RuntimeError as e:
                print(f"  Input {original_input} FAILED: {e}")

demo_futures_exceptions()
```

### Pitfall 6: Sharing Mutable State

```python
import asyncio

# WRONG — race condition even in asyncio (if awaits interleave)
counter = 0

async def unsafe_increment():
    global counter
    for _ in range(1000):
        temp = counter
        await asyncio.sleep(0)  # yields to event loop — another task can modify counter
        counter = temp + 1

async def demo_race():
    global counter
    counter = 0
    async with asyncio.TaskGroup() as tg:
        tg.create_task(unsafe_increment())
        tg.create_task(unsafe_increment())
    print(f"Expected 2000, got {counter}")  # likely less than 2000

# RIGHT — use asyncio.Lock
lock = asyncio.Lock()

async def safe_increment():
    global counter
    for _ in range(1000):
        async with lock:
            temp = counter
            await asyncio.sleep(0)
            counter = temp + 1

async def demo_safe():
    global counter
    counter = 0
    async with asyncio.TaskGroup() as tg:
        tg.create_task(safe_increment())
        tg.create_task(safe_increment())
    print(f"Expected 2000, got {counter}")  # always 2000

asyncio.run(demo_race())
asyncio.run(demo_safe())
```

---

## Quick Reference Card

```text
CONCURRENCY CHEAT SHEET
========================

asyncio (I/O-bound, cooperative):
  asyncio.run(main())                  # entry point
  await coro()                         # run and wait
  asyncio.create_task(coro())          # schedule concurrently
  async with asyncio.TaskGroup() as tg # structured concurrency (3.11+)
  asyncio.to_thread(sync_fn, *args)    # run blocking code in thread
  asyncio.Semaphore(n)                 # limit concurrency
  asyncio.Queue(maxsize=n)             # producer/consumer data passing
  asyncio.PriorityQueue()              # dequeue lowest-value first

concurrent.futures (thread/process pools):
  ThreadPoolExecutor(max_workers=n)    # I/O-bound
  ProcessPoolExecutor(max_workers=n)   # CPU-bound
  executor.map(fn, iterable)           # ordered results
  executor.submit(fn, *args)           # returns Future
  as_completed(futures)                # yield as done

Key rules:
  - Never call time.sleep() in async code — use asyncio.sleep()
  - Always await your tasks or use TaskGroup
  - Use processes for CPU work, async/threads for I/O
  - Re-raise CancelledError after cleanup
  - Use locks when sharing mutable state across tasks/threads
```
