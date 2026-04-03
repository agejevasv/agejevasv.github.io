# Phase 1: What's New in 3.10–3.14

---

> **Prerequisite:** Phase 0 covers core Python fundamentals (data structures, functions, OOP, error handling, type hints, f-strings, etc.) using modern syntax throughout. This phase focuses on **genuinely new language features** added in Python 3.10 through 3.14 — things that change how you design and structure code, beyond the fundamentals.

---

## 1. Protocols for Structural Typing

### What and Why

Protocols let you define interfaces without inheritance — if an object has the right methods, it satisfies the protocol. This is Python's answer to Go-style structural typing. Protocols were introduced in 3.8 via `typing.Protocol`, but they've become increasingly central to idiomatic Python as the ecosystem adopted them (especially combined with 3.12+ type parameter syntax).

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Renderable(Protocol):
    def render(self) -> str: ...

@runtime_checkable
class Closable(Protocol):
    def close(self) -> None: ...

class ClosableRenderable(Renderable, Closable, Protocol):
    """Combine protocols by inheriting from multiple."""
    ...

# --- Concrete classes: NO inheritance from Renderable needed ---

class MarkdownDoc:
    def __init__(self, title: str, body: str):
        self.title = title
        self.body = body

    def render(self) -> str:
        return f"# {self.title}\n\n{self.body}"

class HTMLFragment:
    def __init__(self, tag: str, content: str):
        self.tag = tag
        self.content = content

    def render(self) -> str:
        return f"<{self.tag}>{self.content}</{self.tag}>"

# This function accepts ANY object that has a .render() -> str method.
def publish(item: Renderable) -> None:
    print(item.render())

publish(MarkdownDoc("Hello", "World"))       # works
publish(HTMLFragment("p", "Hello World"))     # works

# runtime_checkable lets you use isinstance:
assert isinstance(MarkdownDoc("", ""), Renderable)
```

```python
# Protocol with properties and multiple methods — modeling a database cursor
from typing import Protocol

class DBCursor(Protocol):
    @property
    def rowcount(self) -> int: ...
    def execute(self, sql: str, params: tuple = ()) -> None: ...
    def fetchall(self) -> list[dict[str, object]]: ...

def run_query(cursor: DBCursor, query: str) -> list[dict[str, object]]:
    cursor.execute(query)
    print(f"Rows affected: {cursor.rowcount}")
    return cursor.fetchall()

# Any database library whose cursor has these methods will work —
# sqlite3, psycopg, mysql-connector — no adapter needed.
```

### Pitfalls

- `@runtime_checkable` protocols only check method *existence*, not signatures. A method with the wrong parameter types will still pass `isinstance`.
- Protocols are structural — a class satisfies a Protocol if it has the right methods, even if it was written before the Protocol existed. This is powerful but means type checkers do the real enforcement, not runtime.

---

## 2. Pattern Matching (`match` / `case`)

### What and Why

Structural pattern matching (3.10+) is far more powerful than a switch statement. It destructures data, binds variables, supports guard clauses, and works with dataclasses, mappings, sequences, and custom classes.

### Example 1: Parsing CLI Commands

```python
import shlex

def handle_command(raw: str) -> str:
    tokens = shlex.split(raw)

    match tokens:
        case ["quit" | "exit"]:
            return "Goodbye."
        case ["help"]:
            return "Available: open, save, find, quit"
        case ["open", filename]:
            return f"Opening {filename}"
        case ["save", filename, "--format", fmt]:
            return f"Saving {filename} as {fmt}"
        case ["find", *terms] if terms:
            return f"Searching for: {' '.join(terms)}"
        case ["find"]:
            return "Error: 'find' requires at least one search term."
        case [unknown_cmd, *_]:
            return f"Unknown command: {unknown_cmd}"
        case _:
            return "Empty input."

print(handle_command("open report.csv"))            # Opening report.csv
print(handle_command("save data.json --format csv"))# Saving data.json as csv
print(handle_command("find memory leak"))            # Searching for: memory leak
print(handle_command("exit"))                        # Goodbye.
```

### Example 2: Handling API Responses

```python
import json

def process_api_response(raw: dict) -> str:
    match raw:
        case {"status": 200, "data": {"users": [first, *rest]}}:
            return f"Found {1 + len(rest)} users. First: {first}"
        case {"status": 200, "data": {"users": []}}:
            return "No users found."
        case {"status": 401, "error": {"message": msg}}:
            return f"Auth failed: {msg}"
        case {"status": 429, "retry_after": int(seconds)}:
            return f"Rate limited. Retry in {seconds}s."
        case {"status": int(code)} if 500 <= code < 600:
            return f"Server error {code}. Try again later."
        case {"status": int(code)}:
            return f"Unexpected status: {code}"
        case _:
            return "Malformed response."

responses = [
    {"status": 200, "data": {"users": ["alice", "bob"]}},
    {"status": 401, "error": {"message": "Token expired"}},
    {"status": 429, "retry_after": 30},
    {"status": 503},
]

for r in responses:
    print(process_api_response(r))
# Found 2 users. First: alice
# Auth failed: Token expired
# Rate limited. Retry in 30s.
# Server error 503. Try again later.
```

### Example 3: Dataclass Matching

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

@dataclass
class Circle:
    center: Point
    radius: float

@dataclass
class Rect:
    origin: Point
    width: float
    height: float

type Shape = Circle | Rect  # 3.12+ type alias

def describe(shape: Shape) -> str:
    match shape:
        case Circle(center=Point(x=0, y=0), radius=r):
            return f"Circle at origin with radius {r}"
        case Circle(center=Point(x=x, y=y), radius=r) if r > 100:
            return f"Large circle (r={r}) at ({x}, {y})"
        case Circle(center=c, radius=r):
            return f"Circle at ({c.x}, {c.y}), r={r}"
        case Rect(origin=Point(x=x, y=y), width=w, height=h) if w == h:
            return f"Square at ({x}, {y}), side={w}"
        case Rect(origin=o, width=w, height=h):
            return f"Rect at ({o.x}, {o.y}), {w}x{h}"

print(describe(Circle(Point(0, 0), 5)))        # Circle at origin with radius 5
print(describe(Circle(Point(1, 2), 200)))      # Large circle (r=200) at (1, 2)
print(describe(Rect(Point(3, 4), 10, 10)))     # Square at (3, 4), side=10
```

### Example 4: Simple Expression Evaluator (AST Processing)

```python
from dataclasses import dataclass

@dataclass
class Num:
    value: float

@dataclass
class BinOp:
    op: str
    left: "Expr"
    right: "Expr"

@dataclass
class UnaryOp:
    op: str
    operand: "Expr"

type Expr = Num | BinOp | UnaryOp

def evaluate(expr: Expr) -> float:
    match expr:
        case Num(value=v):
            return v
        case BinOp(op="+", left=l, right=r):
            return evaluate(l) + evaluate(r)
        case BinOp(op="-", left=l, right=r):
            return evaluate(l) - evaluate(r)
        case BinOp(op="*", left=l, right=r):
            return evaluate(l) * evaluate(r)
        case BinOp(op="/", left=l, right=r):
            divisor = evaluate(r)
            if divisor == 0:
                raise ZeroDivisionError("Division by zero in expression")
            return evaluate(l) / divisor
        case UnaryOp(op="-", operand=o):
            return -evaluate(o)
        case _:
            raise ValueError(f"Unknown expression: {expr}")

# (3 + 4) * -(2)
tree = BinOp("*", BinOp("+", Num(3), Num(4)), UnaryOp("-", Num(2)))
print(evaluate(tree))  # -14.0
```

### Example 5: State Machine with OR Patterns and Guards

```python
from dataclasses import dataclass
from enum import Enum, auto

class HttpMethod(Enum):
    GET = auto()
    POST = auto()
    PUT = auto()
    PATCH = auto()
    DELETE = auto()

@dataclass
class Request:
    method: HttpMethod
    path: str
    body: dict | None = None

def route(req: Request) -> str:
    match req:
        case Request(method=HttpMethod.GET, path="/health"):
            return "200 OK"
        case Request(method=HttpMethod.GET, path=p) if p.startswith("/users/"):
            user_id = p.removeprefix("/users/")
            return f"200 User {user_id}"
        case Request(method=HttpMethod.POST | HttpMethod.PUT, path="/users", body={"name": str(name)}):
            return f"201 Created user {name}"
        case Request(method=HttpMethod.POST | HttpMethod.PUT, path="/users", body=_):
            return "400 Missing 'name' in body"
        case Request(method=HttpMethod.DELETE, path=p) if "/admin" in p:
            return "403 Forbidden"
        case Request(method=HttpMethod.DELETE, path=p):
            return f"200 Deleted {p}"
        case _:
            return "404 Not Found"

print(route(Request(HttpMethod.GET, "/health")))
# 200 OK
print(route(Request(HttpMethod.POST, "/users", {"name": "Alice"})))
# 201 Created user Alice
print(route(Request(HttpMethod.DELETE, "/admin/logs")))
# 403 Forbidden
```

### Pitfalls

- **Names in `case` are capture variables, not value comparisons.** `case HttpMethod.GET:` works because it's a dotted name. But `case x:` always matches and binds the value to `x`. To compare against a local variable, use a guard: `case val if val == x:`.
- Pattern matching does not short-circuit across cases the way you might expect — the *first* matching case wins.
- Don't use it as a glorified if/elif chain for simple equality checks. Use it when you need destructuring.

---

## 3. Dataclasses

### What and Why

Dataclasses eliminate boilerplate for classes that primarily hold data. `slots=True` (3.10+) reduces memory and improves attribute access speed. `frozen=True` makes instances immutable and hashable.

### Practical Examples

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass(frozen=True, slots=True)
class Money:
    amount: int          # cents, to avoid float rounding
    currency: str = "USD"

    def __post_init__(self):
        # Validation runs even with frozen=True via object.__setattr__
        if self.amount < 0:
            raise ValueError(f"Negative amount: {self.amount}")
        if len(self.currency) != 3:
            raise ValueError(f"Invalid currency code: {self.currency}")

    def __str__(self) -> str:
        whole, cents = divmod(self.amount, 100)
        return f"{self.currency} {whole}.{cents:02d}"

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)

price = Money(1999)
tax = Money(160)
print(price + tax)  # USD 21.59

# frozen=True means this works:
prices = {Money(999, "USD"), Money(999, "USD"), Money(500, "EUR")}
print(len(prices))  # 2 (deduplication works because frozen => hashable)
```

```python
from dataclasses import dataclass, field

@dataclass(slots=True)
class HTTPResponse:
    status: int
    body: str
    headers: dict[str, str] = field(default_factory=dict)
    timestamps: list[float] = field(default_factory=list, repr=False)

    def __post_init__(self):
        # Normalize headers to lowercase keys
        self.headers = {k.lower(): v for k, v in self.headers.items()}

    @property
    def ok(self) -> bool:
        return 200 <= self.status < 300

resp = HTTPResponse(200, '{"data": []}', {"Content-Type": "application/json"})
print(resp)
# HTTPResponse(status=200, body='{"data": []}', headers={'content-type': 'application/json'})
# Note: timestamps is excluded from repr because repr=False
print(resp.ok)  # True
```

### Inheritance

```python
from dataclasses import dataclass

@dataclass(slots=True)
class BaseEvent:
    timestamp: float
    source: str

@dataclass(slots=True)
class ClickEvent(BaseEvent):
    x: int
    y: int
    element_id: str

@dataclass(slots=True)
class KeyEvent(BaseEvent):
    key: str
    modifiers: list[str] = field(default_factory=list)

click = ClickEvent(timestamp=1.0, source="web", x=100, y=200, element_id="btn-1")
```

### Comparison: Dataclass vs NamedTuple vs Pydantic

```python
from dataclasses import dataclass
from typing import NamedTuple
from pydantic import BaseModel  # third-party

# ── NamedTuple: lightweight, immutable, tuple-based ──
class PointNT(NamedTuple):
    x: float
    y: float

p = PointNT(1.0, 2.0)
print(p[0])       # 1.0 — it IS a tuple, so indexing works
# p.x = 5        # AttributeError — immutable
# Downside: no default_factory, no __post_init__, no slots benefit
# (already compact as tuple). Inheritance is awkward.

# ── Dataclass: general purpose, mutable or frozen ──
@dataclass(slots=True)
class PointDC:
    x: float
    y: float

d = PointDC(1.0, 2.0)
d.x = 5           # works (unless frozen=True)
# Best for internal data structures, domain models, DTOs.

# ── Pydantic BaseModel: validation, serialization, parsing ──
class PointPY(BaseModel):
    x: float
    y: float

p = PointPY(x="1.5", y="2.5")  # coerces strings to float automatically
print(p.model_dump_json())     # {"x":1.5,"y":2.5}
# Best for API boundaries, config parsing, anything needing validation.
```

**When to use which:**

| Feature | `NamedTuple` | `@dataclass` | Pydantic |
|---|---|---|---|
| Immutable by default | Yes | No (opt-in `frozen`) | Yes (opt-in) |
| Validation | No | Manual `__post_init__` | Built-in |
| Serialization | No | No | Built-in |
| Memory efficient | Yes (tuple) | With `slots=True` | No |
| External dependency | No | No | Yes |

### Pitfalls

- **Mutable defaults:** `field(default_factory=list)` is required. Writing `tags: list[str] = []` is an error that the dataclass decorator catches for you (unlike regular classes where it silently shares one list).
- **`slots=True` and inheritance:** both the parent and child must declare `slots=True` independently. Mixing slotted and non-slotted classes in an inheritance chain causes issues.
- **`frozen=True` and `__post_init__`:** you cannot do `self.x = ...` in `__post_init__` of a frozen class. Use `object.__setattr__(self, 'x', value)` instead.

---

## 4. Walrus Operator (`:=`)

### What and Why

The walrus operator assigns a value to a variable as part of an expression, letting you avoid redundant computations or repeated calls.

### Use Case 1: Regex Matching in Conditionals

```python
import re

log_line = '2026-03-01 ERROR [db.pool] Connection timeout after 30s'

if m := re.match(r'(\S+ \S+) (\w+) \[(.+?)\] (.+)', log_line):
    timestamp, level, module, message = m.groups()
    print(f"[{level}] {module}: {message}")
# Without walrus, you'd need:
#   m = re.match(...)
#   if m:
#       ...
```

### Use Case 2: Processing While Reading

```python
import sys
from pathlib import Path

def find_long_lines(filepath: Path, threshold: int = 120) -> list[str]:
    """Find lines exceeding a length threshold."""
    results = []
    with open(filepath) as f:
        while line := f.readline():
            if len(stripped := line.rstrip()) > threshold:
                results.append(stripped)
    return results
```

### Use Case 3: Filtering with Expensive Computation in Comprehensions

```python
import math

# Without walrus: compute twice or use a nested loop
# With walrus: compute once, filter, and keep the result

raw_data = [1, -5, 16, 0, 25, -3, 49, 2]

# Compute sqrt only for non-negative, keep only those > 3
results = [
    root
    for x in raw_data
    if x >= 0
    if (root := math.sqrt(x)) > 3
]
print(results)  # [4.0, 5.0, 7.0]
```

### Use Case 4: Simplifying API Pagination

```python
def fetch_page(token: str | None) -> dict:
    """Simulated paginated API."""
    pages = {
        None:   {"items": [1, 2, 3],    "next_token": "page2"},
        "page2": {"items": [4, 5, 6],   "next_token": "page3"},
        "page3": {"items": [7],          "next_token": None},
    }
    return pages[token]

all_items = []
response = fetch_page(None)
all_items.extend(response["items"])

while next_token := response.get("next_token"):
    response = fetch_page(next_token)
    all_items.extend(response["items"])

print(all_items)  # [1, 2, 3, 4, 5, 6, 7]
```

### Use Case 5: Avoiding Repeated Dictionary Lookups

```python
config = {"database": {"host": "db.local", "port": 5432}}

if db := config.get("database"):
    host = db.get("host", "localhost")
    port = db.get("port", 5432)
    print(f"Connecting to {host}:{port}")
```

### Pitfalls

- Overuse makes code harder to read. If the assignment and the condition are both simple, `:=` is fine. If either is complex, use separate lines.
- `:=` cannot be used at the top level of a statement. You can't write `x := 5` on its own — it must be inside a larger expression (an `if`, `while`, comprehension, etc.).
- Scoping: in comprehensions, the walrus-bound variable **leaks** into the enclosing scope (unlike the loop variable). This is intentional but sometimes surprising.

---

## 5. Positional-Only Parameters (`/`)

### What and Why

The `/` in a function signature forces all parameters before it to be positional-only — callers cannot use keyword syntax for them. This is useful for APIs where parameter names are implementation details that you want the freedom to rename later.

```python
# Everything before / must be passed positionally.
# Everything after * must be passed as keyword.
# Everything between / and * can be either.

def create_user(name: str, /, *, role: str = "viewer", active: bool = True) -> dict:
    return {"name": name, "role": role, "active": active}

create_user("Alice")                          # OK
create_user("Alice", role="admin")            # OK
# create_user(name="Alice")                   # TypeError: positional-only
# create_user("Alice", "admin")               # TypeError: keyword-only for role
```

### Practical Example: Avoiding Conflict with `**kwargs`

```python
def set_attributes(self, /, **kwargs: object) -> None:
    """Set arbitrary attributes on self.

    Without the /, a caller could not pass an attribute named 'self':
        set_attributes(obj, self="something")  # would collide with the parameter
    """
    for key, value in kwargs.items():
        setattr(self, key, value)

class Config:
    pass

c = Config()
set_attributes(c, host="localhost", port=8080, self="reference")
print(c.host, c.port, c.self)  # localhost 8080 reference
```

### Practical Example: Mathematical Functions

```python
def pow(base: float, exponent: float, /, *, mod: int | None = None) -> float:
    """Mimics math.pow signature.

    'base' and 'exponent' are positional-only because:
    1. The names are obvious from context — pow(2, 10) is clear.
    2. We might rename them later without breaking callers.
    """
    result = base ** exponent
    if mod is not None:
        result = result % mod
    return result

print(pow(2, 10))            # 1024.0
print(pow(2, 10, mod=100))   # 24.0
```

### When to Use

- **Use `/`** when parameter names are not meaningful to the caller (`len(obj)`, `pow(base, exp)`), or when you want to accept `**kwargs` that might collide with parameter names.
- **Use `*`** when you want to force clarity at the call site (`create_user("Alice", role="admin")` is clearer than `create_user("Alice", "admin")`).
- **Combine both** for maximum API control: positional-only for obvious args, keyword-only for options.

### Pitfalls

- Overusing `/` makes your API harder to use when callers have many arguments. Reserve it for functions with 1–3 "obvious" positional arguments.
- `help()` and IDE autocomplete still show the names; `/` only affects how they can be passed.

---

## 6. Exception Groups (`except*`)

### What and Why

Python 3.11 introduced `ExceptionGroup` and `except*` for handling multiple, potentially unrelated exceptions that occur concurrently — a common pattern with `asyncio.TaskGroup` and other concurrent execution models.

### Basic Mechanics

```python
# An ExceptionGroup wraps multiple exceptions
eg = ExceptionGroup("batch errors", [
    ValueError("invalid input: -1"),
    TypeError("expected str, got int"),
    ValueError("invalid input: -99"),
])

# except* matches by type and can handle SUBSETS of the group
try:
    raise eg
except* ValueError as val_group:
    print(f"Caught {len(val_group.exceptions)} ValueErrors:")
    for e in val_group.exceptions:
        print(f"  - {e}")
except* TypeError as type_group:
    print(f"Caught {len(type_group.exceptions)} TypeErrors:")
    for e in type_group.exceptions:
        print(f"  - {e}")

# Output:
# Caught 2 ValueErrors:
#   - invalid input: -1
#   - invalid input: -99
# Caught 1 TypeErrors:
#   - expected str, got int
```

### Practical Example: Concurrent Task Error Handling

```python
import asyncio

async def fetch_url(url: str) -> str:
    # Simulate different failure modes
    if "timeout" in url:
        raise TimeoutError(f"Timeout: {url}")
    if "auth" in url:
        raise PermissionError(f"403 Forbidden: {url}")
    if "bad" in url:
        raise ValueError(f"Bad URL: {url}")
    return f"OK: {url}"

async def fetch_all(urls: list[str]) -> list[str]:
    results = []
    try:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch_url(u)) for u in urls]
    except* TimeoutError as eg:
        print("Timeouts — will retry later:")
        for e in eg.exceptions:
            print(f"  {e}")
    except* PermissionError as eg:
        print("Auth failures — need re-authentication:")
        for e in eg.exceptions:
            print(f"  {e}")
    except* ValueError as eg:
        print("Bad input — skipping:")
        for e in eg.exceptions:
            print(f"  {e}")
    else:
        results = [t.result() for t in tasks]
    return results

# asyncio.run(fetch_all(["https://timeout.com", "https://auth.com", "https://ok.com"]))
```

### Practical Example: Batch Validation

```python
from dataclasses import dataclass

@dataclass
class ValidationError(Exception):
    field: str
    message: str

def validate_user_input(data: dict) -> dict:
    errors = []

    if not isinstance(data.get("name"), str) or len(data["name"]) < 1:
        errors.append(ValidationError("name", "Name is required"))
    if not isinstance(data.get("age"), int) or data["age"] < 0:
        errors.append(ValidationError("age", "Age must be a non-negative integer"))
    if not isinstance(data.get("email"), str) or "@" not in data.get("email", ""):
        errors.append(ValidationError("email", "Valid email required"))

    if errors:
        raise ExceptionGroup("Validation failed", errors)

    return data

try:
    validate_user_input({"name": "", "age": -5, "email": "bad"})
except* ValidationError as eg:
    print(f"{len(eg.exceptions)} validation error(s):")
    for e in eg.exceptions:
        print(f"  {e.field}: {e.message}")
# 3 validation error(s):
#   name: Name is required
#   age: Age must be a non-negative integer
#   email: Valid email required
```

### Pitfalls

- `except*` and `except` **cannot be mixed** in the same `try` block.
- `except*` always receives an `ExceptionGroup`, even if only one exception of that type was in the group. Access individual exceptions via `.exceptions`.
- If you re-raise from `except*`, only the unhandled exceptions propagate. Handled subsets are consumed.
- For simple sequential code with at most one exception, stick with regular `try`/`except`. Exception groups add complexity that is only worthwhile for concurrent or batch scenarios.

---

## 7. Type Parameter Syntax (3.12+)

### What and Why

Python 3.12 introduced dedicated syntax for generics: `class Foo[T]:`, `def bar[T]():`, and the `type` statement for aliases. This replaces the verbose `TypeVar` dance.

### Before / After

```python
# ── OLD STYLE (Python 3.11 and earlier) ──
from typing import TypeVar, Generic

T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

def first(items: list[T]) -> T:
    return items[0]

def merge_dicts(a: dict[K, V], b: dict[K, V]) -> dict[K, V]:
    return {**a, **b}
```

```python
# ── NEW STYLE (Python 3.12+) ──
# No imports. The type parameters are declared inline.

class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

def first[T](items: list[T]) -> T:
    return items[0]

def merge_dicts[K, V](a: dict[K, V], b: dict[K, V]) -> dict[K, V]:
    return {**a, **b}
```

### The `type` Statement for Aliases

```python
# ── OLD ──
from typing import TypeAlias, Union
JSON: TypeAlias = Union[str, int, float, bool, None, list["JSON"], dict[str, "JSON"]]

# ── NEW (3.12+) ──
type JSON = str | int | float | bool | None | list[JSON] | dict[str, JSON]
# The forward reference to JSON just works — no quotes needed.
```

### Bounds and Constraints

```python
from typing import Protocol

class Comparable(Protocol):
    def __lt__(self, other: object) -> bool: ...

# T is bounded: it must satisfy the Comparable protocol
def min_value[T: Comparable](items: list[T]) -> T:
    result = items[0]
    for item in items[1:]:
        if item < result:
            result = item
    return result

print(min_value([3, 1, 4, 1, 5]))    # 1
print(min_value(["banana", "apple"])) # apple
```

```python
# Constrained type: T can only be str or bytes (not any subtype)
def concat[T: (str, bytes)](a: T, b: T) -> T:
    return a + b

print(concat("hello ", "world"))   # hello world
print(concat(b"hello ", b"world")) # b'hello world'
# concat(1, 2)  # type checker error: int is not str or bytes
```

### Practical Example: Generic Repository Pattern

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class User:
    id: int
    name: str

@dataclass(frozen=True, slots=True)
class Product:
    id: int
    title: str
    price_cents: int

class Repository[T]:
    """A generic in-memory repository for any entity with an 'id' attribute."""

    def __init__(self) -> None:
        self._store: dict[int, T] = {}

    def add(self, entity: T) -> None:
        self._store[entity.id] = entity  # type: ignore[attr-defined]

    def get(self, entity_id: int) -> T | None:
        return self._store.get(entity_id)

    def all(self) -> list[T]:
        return list(self._store.values())

    def remove(self, entity_id: int) -> T | None:
        return self._store.pop(entity_id, None)

users: Repository[User] = Repository()
users.add(User(1, "Alice"))
users.add(User(2, "Bob"))
print(users.get(1))   # User(id=1, name='Alice')
print(users.all())     # [User(id=1, name='Alice'), User(id=2, name='Bob')]

products: Repository[Product] = Repository()
products.add(Product(1, "Widget", 999))
print(products.get(1)) # Product(id=1, title='Widget', price_cents=999)
```

### Practical Example: Generic Pipeline / Chain

```python
from collections.abc import Callable

class Pipeline[T]:
    """Chain transformations on a value."""

    def __init__(self, value: T) -> None:
        self._value = value

    def then[U](self, fn: Callable[[T], U]) -> "Pipeline[U]":
        return Pipeline(fn(self._value))

    @property
    def result(self) -> T:
        return self._value

output = (
    Pipeline("  Hello, World!  ")
    .then(str.strip)
    .then(str.lower)
    .then(lambda s: s.replace(",", ""))
    .then(str.split)
    .then(len)
    .result
)
print(output)  # 2
```

### Variance (Advanced)

In 3.12+, variance is inferred by type checkers based on usage rather than declared explicitly. However, you can still be explicit:

```python
# Covariant: Producer[Dog] is a subtype of Producer[Animal]
class Producer[out T]:  # 'out' = covariant (3.12+ syntax)
    def get(self) -> T: ...

# Contravariant: Consumer[Animal] is a subtype of Consumer[Dog]
class Consumer[in T]:  # 'in' = contravariant
    def accept(self, item: T) -> None: ...

# Invariant (default): neither covariant nor contravariant
class Box[T]:
    def get(self) -> T: ...
    def set(self, item: T) -> None: ...
```

### Pitfalls

- The new syntax is 3.12+ only. If you need to support older Pythons, stick with `TypeVar`.
- `class Foo[T]:` creates a *new scope* for `T` that is different from a module-level `TypeVar("T")`. Two classes `Foo[T]` and `Bar[T]` have independent type parameters — their `T` is not the same.
- The `type` statement creates *lazy* aliases evaluated at access time, which is how recursive types work. This means typos in the alias body won't be caught until the alias is used.
- `out` and `in` variance markers are syntactic sugar recognized by type checkers. At runtime, they have no effect.

---

## 8. Enum & StrEnum

### What and Why

Enums define a fixed set of named constants with type safety and rich behavior. Python's `enum` module has evolved significantly: `Enum` and `IntEnum` have been available since 3.4, but `StrEnum` (3.11+) is the most impactful addition — it creates enum members that are also strings, which makes them directly usable in JSON, APIs, and string comparisons without `.value` everywhere.

### Basic Enum and StrEnum

```python
from enum import Enum, StrEnum, IntEnum, auto, unique

# ── StrEnum (3.11+): members ARE strings ──
class HttpMethod(StrEnum):
    GET = auto()      # "get" — auto() lowercases the member name for StrEnum
    POST = auto()     # "post"
    PUT = auto()      # "put"
    PATCH = auto()    # "patch"
    DELETE = auto()   # "delete"

# StrEnum members work directly as strings — no .value needed
print(HttpMethod.GET == "get")                # True
print(f"Method: {HttpMethod.POST}")           # Method: post
print(HttpMethod.DELETE.upper())              # DELETE

# Iterate over all members
for method in HttpMethod:
    print(method, end=" ")  # get post put patch delete
print()
```

```python
# ── Enum with explicit values ──
class LogLevel(Enum):
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50

    def __ge__(self, other: "LogLevel") -> bool:
        return self.value >= other.value

    def __gt__(self, other: "LogLevel") -> bool:
        return self.value > other.value

def should_log(message_level: LogLevel, threshold: LogLevel) -> bool:
    return message_level >= threshold

print(should_log(LogLevel.ERROR, LogLevel.WARNING))  # True
print(should_log(LogLevel.DEBUG, LogLevel.INFO))      # False
```

### `@unique` and Preventing Aliases

```python
from enum import Enum, unique

@unique
class Color(Enum):
    RED = 1
    GREEN = 2
    BLUE = 3
    # CRIMSON = 1  # ValueError: duplicate values found — @unique prevents this

# Without @unique, duplicate values create ALIASES (not errors):
class Mood(Enum):
    HAPPY = 1
    JOYFUL = 1    # alias for HAPPY
    SAD = 2

print(Mood.HAPPY is Mood.JOYFUL)  # True — same member
print(list(Mood))                   # [<Mood.HAPPY: 1>, <Mood.SAD: 2>]  — aliases excluded from iteration
```

### `auto()` for Automatic Values

```python
from enum import Enum, StrEnum, auto

# For regular Enum, auto() generates incrementing integers (1, 2, 3...)
class Direction(Enum):
    NORTH = auto()  # 1
    SOUTH = auto()  # 2
    EAST = auto()   # 3
    WEST = auto()   # 4

# For StrEnum, auto() generates lowercased member names
class ContentType(StrEnum):
    JSON = auto()        # "json"
    XML = auto()         # "xml"
    FORM_DATA = auto()   # "form_data"

# Override auto() by defining _generate_next_value_
class Permission(Enum):
    @staticmethod
    def _generate_next_value_(name: str, start: int, count: int, last_values: list) -> str:
        return name.lower().replace("_", ":")

    READ_USERS = auto()     # "read:users"
    WRITE_USERS = auto()    # "write:users"
    ADMIN_PANEL = auto()    # "admin:panel"

print(Permission.READ_USERS.value)   # read:users
print(Permission.ADMIN_PANEL.value)  # admin:panel
```

### Practical Example: Configuration with StrEnum

```python
from enum import StrEnum, auto
from dataclasses import dataclass

class Environment(StrEnum):
    DEV = auto()
    STAGING = auto()
    PRODUCTION = auto()

class CacheBackend(StrEnum):
    MEMORY = auto()
    REDIS = auto()
    MEMCACHED = auto()

@dataclass(frozen=True, slots=True)
class AppConfig:
    env: Environment
    cache: CacheBackend
    debug: bool = False

    def __post_init__(self):
        # StrEnum works in string comparisons and f-strings naturally
        if self.env == "production" and self.debug:
            raise ValueError("Debug mode not allowed in production")

config = AppConfig(env=Environment.PRODUCTION, cache=CacheBackend.REDIS)
print(f"Running in {config.env} with {config.cache} cache")
# Running in production with redis cache

# StrEnum members can be used anywhere a string is expected
import json
print(json.dumps({"env": config.env}))  # {"env": "production"}
```

### Practical Example: Pattern Matching with Enums

```python
from enum import StrEnum, auto

class TaskStatus(StrEnum):
    PENDING = auto()
    RUNNING = auto()
    SUCCESS = auto()
    FAILED = auto()
    CANCELLED = auto()

def handle_status(status: TaskStatus) -> str:
    match status:
        case TaskStatus.SUCCESS:
            return "Task completed successfully"
        case TaskStatus.FAILED:
            return "Task failed — check logs"
        case TaskStatus.RUNNING:
            return "Task still in progress"
        case TaskStatus.PENDING:
            return "Task queued, waiting for resources"
        case TaskStatus.CANCELLED:
            return "Task was cancelled"

for s in TaskStatus:
    print(f"  {s}: {handle_status(s)}")
```

### When to Use Enum vs Literal Strings

| Scenario | Use | Why |
|---|---|---|
| Fixed set of options used across the codebase | `StrEnum` | Type safety, autocomplete, refactor-friendly |
| Internal function with 2–3 string options | `Literal["a", "b"]` | Less boilerplate for simple cases |
| Numeric constants with ordering | `IntEnum` or `Enum` | Comparison operators, prevents invalid values |
| Config values that serialize to JSON/YAML | `StrEnum` | Members ARE strings — no `.value` needed |
| API response codes from external systems | `StrEnum` | Validates against known set, readable |

### Pitfalls

- `IntEnum` members pass `isinstance(x, int)` checks and can be used in arithmetic (`Color.RED + 1`), which can lead to surprising behavior. Prefer plain `Enum` unless you genuinely need integer semantics.
- `StrEnum`'s `auto()` lowercases the member name. If you need exact casing (e.g., `"GET"` not `"get"`), assign values explicitly.
- Enum members are singletons — `Color.RED is Color.RED` is always `True`. But `Color("red")` does a lookup-by-value, and raises `ValueError` if not found. Use `Color["RED"]` for name-based lookup.
- Enum classes cannot be subclassed if they define any members. This is intentional — it prevents broken Liskov substitution.

---

## 9. `typing.Annotated`

### What and Why

`typing.Annotated` (3.9+) lets you attach arbitrary metadata to a type hint without changing what the type checker sees. The type checker only looks at the first argument; everything after it is metadata that frameworks can read at runtime.

This is the mechanism that powers FastAPI's `Depends()`, Typer's CLI argument parsing, Pydantic's `Field()` constraints, and similar metadata-driven APIs. Understanding it is essential before Phase 4.

### Basic Syntax

```python
from typing import Annotated

# The type checker sees `int`. The metadata (gt=0) is for frameworks to read.
type PositiveInt = Annotated[int, "positive"]

# With Pydantic-style metadata (conceptual — works with Pydantic v2)
from pydantic import Field
type UserId = Annotated[int, Field(gt=0, description="Unique user identifier")]
type Username = Annotated[str, Field(min_length=3, max_length=50)]
type Email = Annotated[str, Field(pattern=r"^[\w.+-]+@[\w-]+\.[\w.]+$")]

from dataclasses import dataclass

@dataclass
class CreateUserRequest:
    user_id: UserId
    name: Username
    email: Email
```

### Why Frameworks Use It

Without `Annotated`, frameworks had to choose between function signature metadata (like default values) and type information — they couldn't have both cleanly. `Annotated` solves this:

```python
from typing import Annotated

# ── The problem Annotated solves ──

# FastAPI before Annotated: the default value IS the dependency
# def get_users(db: Session = Depends(get_db)):  # "default" isn't really a default

# FastAPI with Annotated: metadata is separate from the type
# def get_users(db: Annotated[Session, Depends(get_db)]):
#     Type checkers see Session. FastAPI reads Depends(get_db).

# Typer before Annotated:
# def main(name: str = typer.Argument(..., help="User name")):

# Typer with Annotated:
# def main(name: Annotated[str, typer.Argument(help="User name")]):
#     The type is str. The CLI metadata is in Annotated.
```

### Reading Annotations at Runtime

Here's how a framework might inspect `Annotated` metadata — this demystifies what FastAPI and Pydantic do under the hood:

```python
from typing import Annotated, get_type_hints, get_args, get_origin
from dataclasses import dataclass
import inspect

# Define a simple metadata class
@dataclass(frozen=True)
class Constraint:
    gt: float | None = None
    lt: float | None = None
    min_length: int | None = None
    description: str = ""

# Use Annotated to attach constraints
type Port = Annotated[int, Constraint(gt=0, lt=65536, description="TCP port")]
type Hostname = Annotated[str, Constraint(min_length=1, description="Server hostname")]

@dataclass
class ServerConfig:
    host: Hostname
    port: Port
    workers: Annotated[int, Constraint(gt=0, description="Number of workers")]

# Framework reads the metadata at runtime:
def extract_constraints(cls: type) -> dict[str, Constraint]:
    """Extract Constraint metadata from Annotated type hints."""
    hints = get_type_hints(cls, include_extras=True)
    result = {}
    for field_name, hint in hints.items():
        if get_origin(hint) is Annotated:
            args = get_args(hint)
            for arg in args[1:]:  # skip the actual type (args[0])
                if isinstance(arg, Constraint):
                    result[field_name] = arg
    return result

constraints = extract_constraints(ServerConfig)
for name, c in constraints.items():
    print(f"  {name}: {c}")
# host: Constraint(gt=None, lt=None, min_length=1, description='Server hostname')
# port: Constraint(gt=0, lt=65536, min_length=None, description='TCP port')
# workers: Constraint(gt=0, lt=None, min_length=None, description='Number of workers')
```

### Stacking Multiple Annotations

```python
from typing import Annotated
from dataclasses import dataclass

@dataclass(frozen=True)
class Doc:
    description: str

@dataclass(frozen=True)
class Validate:
    min_val: int = 0
    max_val: int = 100

# Multiple metadata items — frameworks pick out what they understand
type Percentage = Annotated[int, Validate(min_val=0, max_val=100), Doc("A percentage value 0–100")]

# Each framework reads only the metadata types it recognizes.
# A validation framework reads Validate; a docs generator reads Doc.
```

### Pitfalls

- Type checkers ignore everything after the first argument to `Annotated`. If you write `Annotated[int, "must be positive"]`, mypy just sees `int` — the string is invisible to static analysis.
- `get_type_hints(cls)` by default strips `Annotated` wrappers. Pass `include_extras=True` to preserve them.
- `Annotated` metadata is not validated at definition time. `Annotated[int, "not a real constraint"]` is perfectly valid Python — it's up to the consuming framework to make sense of the metadata.
- You can nest `Annotated` — `Annotated[Annotated[int, A], B]` is equivalent to `Annotated[int, A, B]`. This can happen accidentally with type aliases and can be confusing.

---

## Quick Reference Table

| Feature | Min Version | Replaces / Enables |
|---|---|---|
| `match` / `case` | 3.10 | if/elif chains, visitor pattern |
| `@dataclass(slots=True)` | 3.10 | `__slots__` boilerplate |
| `StrEnum` | 3.11 | String constants, `Literal` for fixed sets |
| `except*` | 3.11 | Manual exception aggregation |
| `class Foo[T]:` | 3.12 | `TypeVar` + `Generic[T]` |
| `type Alias = ...` | 3.12 | `TypeAlias` |
| Walrus `:=` | 3.8 | Separate assign + test |
| Positional-only `/` | 3.8 | Convention only |
| `Protocol` | 3.8 | ABC for structural typing |
| `Annotated[T, metadata]` | 3.9 | Framework metadata on types |
