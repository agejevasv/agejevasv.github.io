# Phase 4: Essential Python Libraries

A hands-on guide with real, runnable code examples for each library.

---

## Table of Contents

1. [FastAPI](#1-fastapi)
2. [Pydantic v2](#2-pydantic-v2)
3. [httpx](#3-httpx)
4. [pytest + Hypothesis](#4-pytest--hypothesis)
5. [SQLAlchemy 2.0 + asyncpg](#5-sqlalchemy-20--asyncpg)
6. [Typer](#6-typer)
7. [structlog](#7-structlog)
8. [Polars](#8-polars)
9. [DuckDB](#9-duckdb)
10. [orjson / msgspec](#10-orjson--msgspec)

---

## 1. FastAPI

```bash
pip install "fastapi[standard]"
```

FastAPI is an async-first web framework built on Starlette and Pydantic. It generates OpenAPI docs automatically and is one of the fastest Python web frameworks available.

### Minimal Example

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "hello world"}

# Run: uvicorn main:app --reload
```

### Routes, Path Parameters, and Query Parameters

```python
from fastapi import FastAPI, Query, Path

app = FastAPI(title="Bookstore API")

# Path parameter with validation
@app.get("/books/{book_id}")
async def get_book(
    book_id: int = Path(..., gt=0, description="The ID of the book"),
):
    return {"book_id": book_id}

# Query parameters with defaults and validation
@app.get("/books")
async def list_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    genre: str | None = Query(None, min_length=2),
):
    return {"skip": skip, "limit": limit, "genre": genre}
```

### Request/Response Models with Pydantic

```python
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import FastAPI

app = FastAPI()

class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    author: str
    isbn: str = Field(..., pattern=r"^\d{13}$")
    price: float = Field(..., gt=0)

class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    isbn: str
    price: float
    created_at: datetime

    model_config = {"from_attributes": True}

# In-memory store for the example
_books: dict[int, dict] = {}
_next_id = 1

@app.post("/books", response_model=BookResponse, status_code=201)
async def create_book(book: BookCreate):
    global _next_id
    record = {
        "id": _next_id,
        **book.model_dump(),
        "created_at": datetime.now(),
    }
    _books[_next_id] = record
    _next_id += 1
    return record
```

### Dependency Injection

```python
from fastapi import FastAPI, Depends, Header, HTTPException

app = FastAPI()

# Simple dependency
async def get_current_user(x_token: str = Header(...)) -> dict:
    if x_token != "secret-token":
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"user_id": 1, "username": "alice"}

# Dependency that depends on another dependency
async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["username"] != "alice":
        raise HTTPException(status_code=403, detail="Not admin")
    return user

@app.get("/admin/dashboard")
async def admin_dashboard(admin: dict = Depends(require_admin)):
    return {"message": f"Welcome, {admin['username']}"}

# Class-based dependency (useful for parameterized deps)
class Paginator:
    def __init__(self, skip: int = 0, limit: int = 20):
        self.skip = skip
        self.limit = limit

@app.get("/items")
async def list_items(pagination: Paginator = Depends()):
    return {"skip": pagination.skip, "limit": pagination.limit}
```

### Background Tasks

```python
import asyncio
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()

async def send_email(to: str, subject: str):
    """Simulate sending an email."""
    await asyncio.sleep(2)  # pretend this is slow I/O
    print(f"Email sent to {to}: {subject}")

@app.post("/orders")
async def create_order(background_tasks: BackgroundTasks):
    order_id = 42
    # This runs after the response is sent
    background_tasks.add_task(
        send_email,
        to="customer@example.com",
        subject=f"Order {order_id} confirmed",
    )
    return {"order_id": order_id, "status": "created"}
```

### Middleware

```python
import time
from fastapi import FastAPI, Request

app = FastAPI()

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{elapsed:.4f}"
    return response
```

### Complete Example: CRUD REST API

```python
"""
A complete bookstore REST API.

Run: uvicorn bookstore:app --reload
Docs: http://127.0.0.1:8000/docs
"""
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query, Path, Depends, Request
from pydantic import BaseModel, Field
import time

# ---------- Models ----------

class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1)
    isbn: str = Field(..., pattern=r"^\d{13}$")
    price: float = Field(..., gt=0)
    tags: list[str] = []

class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    price: float | None = Field(None, gt=0)
    tags: list[str] | None = None

class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    isbn: str
    price: float
    tags: list[str]
    created_at: datetime
    updated_at: datetime

# ---------- In-memory "database" ----------

class BookStore:
    def __init__(self):
        self._books: dict[int, dict] = {}
        self._next_id = 1

    def create(self, data: BookCreate) -> dict:
        now = datetime.now()
        book = {
            "id": self._next_id,
            **data.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        self._books[self._next_id] = book
        self._next_id += 1
        return book

    def get(self, book_id: int) -> dict | None:
        return self._books.get(book_id)

    def list_all(self, skip: int, limit: int) -> list[dict]:
        items = list(self._books.values())
        return items[skip : skip + limit]

    def update(self, book_id: int, data: BookUpdate) -> dict | None:
        book = self._books.get(book_id)
        if not book:
            return None
        updates = data.model_dump(exclude_unset=True)
        book.update(updates)
        book["updated_at"] = datetime.now()
        return book

    def delete(self, book_id: int) -> bool:
        return self._books.pop(book_id, None) is not None

store = BookStore()

# ---------- App ----------

app = FastAPI(title="Bookstore API", version="1.0.0")

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter() - start:.4f}"
    return response

@app.post("/books", response_model=BookResponse, status_code=201)
async def create_book(book: BookCreate):
    return store.create(book)

@app.get("/books", response_model=list[BookResponse])
async def list_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    return store.list_all(skip, limit)

@app.get("/books/{book_id}", response_model=BookResponse)
async def get_book(book_id: int = Path(..., gt=0)):
    book = store.get(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@app.patch("/books/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int = Path(..., gt=0),
    data: BookUpdate = ...,
):
    book = store.update(book_id, data)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@app.delete("/books/{book_id}", status_code=204)
async def delete_book(book_id: int = Path(..., gt=0)):
    if not store.delete(book_id):
        raise HTTPException(status_code=404, detail="Book not found")
```

---

## 2. Pydantic v2

```bash
pip install pydantic pydantic-settings
```

Pydantic v2 is a complete rewrite with a Rust-based core (`pydantic-core`) that is 5-50x faster than v1.

### Model Definition and Basic Usage

```python
from datetime import datetime
from pydantic import BaseModel, Field

class User(BaseModel):
    id: int
    name: str = Field(..., min_length=1, max_length=100)
    email: str
    age: int = Field(..., ge=0, le=150)
    tags: list[str] = []
    created_at: datetime = Field(default_factory=datetime.now)

# Construct from a dict
user = User(id=1, name="Alice", email="alice@example.com", age=30)
print(user.model_dump())
# {'id': 1, 'name': 'Alice', 'email': 'alice@example.com', 'age': 30,
#  'tags': [], 'created_at': datetime.datetime(...)}

# JSON round-trip
json_str = user.model_dump_json(indent=2)
print(json_str)
user2 = User.model_validate_json(json_str)
assert user2 == user
```

### field_validator and model_validator

```python
from pydantic import BaseModel, field_validator, model_validator

class SignupForm(BaseModel):
    username: str
    password: str
    password_confirm: str
    email: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError("must be alphanumeric")
        return v.lower()

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("invalid email")
        return v.lower()

    @model_validator(mode="after")
    def passwords_match(self) -> "SignupForm":
        if self.password != self.password_confirm:
            raise ValueError("passwords do not match")
        return self

# This works
form = SignupForm(
    username="Alice42",
    password="secret",
    password_confirm="secret",
    email="Alice@Example.com",
)
print(form.username)  # "alice42" — lowered by validator
print(form.email)     # "alice@example.com"

# This raises ValidationError: passwords do not match
try:
    SignupForm(
        username="Bob",
        password="a",
        password_confirm="b",
        email="bob@x.com",
    )
except Exception as e:
    print(e)
```

### Settings Management with pydantic-settings

#### Basic Usage

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class AppSettings(BaseSettings):
    """
    Reads from environment variables (case-insensitive) and .env files.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="APP_",       # e.g. APP_DATABASE_URL
    )

    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:3000"]
    max_connections: int = Field(10, ge=1)

# With APP_DATABASE_URL="postgresql://..." in the environment:
# settings = AppSettings()
# print(settings.database_url)
```

#### Nested Settings with `env_nested_delimiter`

Use nested models to organize related settings. The delimiter maps flat environment variables to nested structure.

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class DatabaseSettings(BaseSettings):
    host: str = "localhost"
    port: int = 5432
    name: str = "mydb"
    user: str = "postgres"
    password: str = ""

    @property
    def url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

class RedisSettings(BaseSettings):
    host: str = "localhost"
    port: int = 6379
    db: int = 0

class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APP_",
        env_nested_delimiter="__",  # double underscore separates nesting levels
    )

    debug: bool = False
    database: DatabaseSettings = DatabaseSettings()
    redis: RedisSettings = RedisSettings()

# Set in environment or .env:
#   APP_DATABASE__HOST=db.prod.internal
#   APP_DATABASE__PORT=5432
#   APP_DATABASE__PASSWORD=s3cret
#   APP_REDIS__HOST=redis.prod.internal
#   APP_DEBUG=false

# settings = AppSettings()
# print(settings.database.url)
#   -> "postgresql://postgres:s3cret@db.prod.internal:5432/mydb"
# print(settings.redis.host)
#   -> "redis.prod.internal"
```

#### Multiple `.env` Files (Override Chain)

Later files override earlier ones. This lets you have base defaults with local overrides.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),  # .env.local overrides .env
    )

    database_url: str
    debug: bool = False
    secret_key: str

# .env (committed to repo — safe defaults):
#   DATABASE_URL=postgresql://localhost/mydb
#   DEBUG=false
#   SECRET_KEY=change-me-in-local
#
# .env.local (gitignored — developer overrides):
#   SECRET_KEY=my-dev-secret
#   DEBUG=true
#
# Result: database_url from .env, secret_key and debug from .env.local
```

#### Secrets from Files (Docker Secrets)

Docker Swarm and Kubernetes mount secrets as files under `/run/secrets/`. pydantic-settings can read values from files instead of environment variables.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        secrets_dir="/run/secrets",  # reads files from this directory
    )

    database_url: str       # reads from /run/secrets/database_url
    api_key: str            # reads from /run/secrets/api_key
    debug: bool = False     # no file needed — uses default

# Priority order (highest wins):
# 1. Environment variables
# 2. Secrets files (secrets_dir)
# 3. .env file
# 4. Field defaults
#
# So you can override a Docker secret with an env var in development.
```

#### Multi-Environment Pattern

Use an `ENV` variable to load the right `.env` file for each environment.

```python
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", f".env.{os.getenv('ENV', 'development')}"),
    )

    env: str = "development"
    database_url: str
    debug: bool = False
    log_level: str = "INFO"

@lru_cache  # singleton — only load once
def get_settings() -> Settings:
    return Settings()

# Directory layout:
#   .env                  — shared base config
#   .env.development      — local dev overrides (DEBUG=true, etc.)
#   .env.staging          — staging config
#   .env.production       — prod config (minimal — most secrets come from env vars)
#
# Usage:
#   ENV=production python app.py      -> loads .env then .env.production
#   python app.py                     -> loads .env then .env.development (default)
```

#### Validation on Startup — Crash Fast

pydantic-settings validates at instantiation time. If config is missing or invalid, your app crashes immediately with a clear error — not 3 hours later when the code path is first hit.

```python
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_")

    database_url: str                          # required — no default
    port: int = Field(8000, ge=1, le=65535)    # validated range
    workers: int = Field(4, ge=1)
    log_level: str = "INFO"

# Instantiate at module level — app won't even start if config is bad
settings = Settings()

# If APP_DATABASE_URL is not set:
# pydantic_settings.ValidationError:
#   1 validation error for Settings
#   database_url
#     Field required [type=missing, ...]

# If APP_PORT=99999:
# pydantic_settings.ValidationError:
#   1 validation error for Settings
#   port
#     Input should be less than or equal to 65535 [type=less_than_equal, ...]
#
# This is exactly what you want: fail loud at startup, not silently at runtime.
```

### JSON Schema Generation

```python
from pydantic import BaseModel, Field
import json

class Address(BaseModel):
    street: str
    city: str
    country: str = "US"

class Customer(BaseModel):
    """A customer record."""
    name: str = Field(..., description="Full legal name")
    age: int = Field(..., ge=0, description="Age in years")
    address: Address
    vip: bool = False

schema = Customer.model_json_schema()
print(json.dumps(schema, indent=2))
# Produces a full JSON Schema with $defs for nested models,
# descriptions, constraints, etc. — ready for OpenAPI or code generation.
```

### Key v1 vs v2 Differences

```python
# ┌──────────────────────────┬──────────────────────────────────┐
# │ Pydantic v1              │ Pydantic v2                      │
# ├──────────────────────────┼──────────────────────────────────┤
# │ class Config:            │ model_config = ConfigDict(...)    │
# │   orm_mode = True        │   from_attributes=True           │
# │                          │                                  │
# │ .dict()                  │ .model_dump()                    │
# │ .json()                  │ .model_dump_json()               │
# │ .parse_obj(data)         │ .model_validate(data)            │
# │ .parse_raw(s)            │ .model_validate_json(s)          │
# │ .schema()                │ .model_json_schema()             │
# │                          │                                  │
# │ @validator               │ @field_validator                  │
# │ @root_validator          │ @model_validator                  │
# │                          │                                  │
# │ Pure Python core         │ Rust core (pydantic-core)        │
# │ ~1x speed                │ ~5-50x faster                    │
# └──────────────────────────┴──────────────────────────────────┘
```

---

## 3. httpx

```bash
pip install httpx[http2]
```

httpx is a modern HTTP client with sync and async APIs, HTTP/2 support, and a requests-compatible interface.

### Minimal Example (Sync)

```python
import httpx

response = httpx.get("https://httpbin.org/get", params={"q": "python"})
print(response.status_code)  # 200
print(response.json())
```

### Async Usage

```python
import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Concurrent requests
        responses = await asyncio.gather(
            client.get("https://httpbin.org/get"),
            client.get("https://httpbin.org/ip"),
        )
        for r in responses:
            print(r.status_code, r.json())

asyncio.run(main())
```

### HTTP/2

```python
import httpx

# HTTP/2 requires the h2 package (installed via httpx[http2])
with httpx.Client(http2=True) as client:
    r = client.get("https://httpbin.org/get")
    print(r.http_version)  # "HTTP/2"
```

### Streaming Responses

```python
import httpx

# Stream a large file without loading it all into memory
with httpx.Client() as client:
    with client.stream("GET", "https://speed.hetzner.de/100MB.bin") as response:
        total = 0
        with open("/tmp/download.bin", "wb") as f:
            for chunk in response.iter_bytes(chunk_size=8192):
                f.write(chunk)
                total += len(chunk)
        print(f"Downloaded {total:,} bytes")
```

### Authentication, Timeouts, Retries

```python
import httpx

# Bearer token auth
client = httpx.Client(
    base_url="https://api.example.com/v1",
    headers={"Authorization": "Bearer my-token"},
    timeout=httpx.Timeout(
        connect=5.0,    # seconds to establish connection
        read=30.0,      # seconds to receive response
        write=10.0,     # seconds to send request body
        pool=5.0,       # seconds to acquire a connection from pool
    ),
)

# httpx itself does not have built-in retry. Use httpx + tenacity:
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def fetch_with_retry(url: str) -> httpx.Response:
    r = httpx.get(url)
    r.raise_for_status()
    return r
```

### Realistic Example: API Client Class

```python
import httpx
from pydantic import BaseModel

class Repo(BaseModel):
    name: str
    full_name: str
    stargazers_count: int
    language: str | None

class GitHubClient:
    def __init__(self, token: str | None = None):
        headers = {"Accept": "application/vnd.github+json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._client = httpx.AsyncClient(
            base_url="https://api.github.com",
            headers=headers,
            timeout=10.0,
        )

    async def get_repo(self, owner: str, name: str) -> Repo:
        r = await self._client.get(f"/repos/{owner}/{name}")
        r.raise_for_status()
        return Repo.model_validate(r.json())

    async def close(self):
        await self._client.aclose()

# Usage:
# async with GitHubClient() as gh:
#     repo = await gh.get_repo("encode", "httpx")
#     print(repo.stargazers_count)
```

---

## 4. pytest + Hypothesis

```bash
pip install pytest pytest-asyncio pytest-mock hypothesis
```

### Fixtures and Parametrize

```python
# test_math.py
import pytest

# ---------- Fixtures ----------

@pytest.fixture
def db_connection():
    """Fixture with setup and teardown."""
    conn = {"connected": True}  # stand-in for a real connection
    yield conn
    conn["connected"] = False  # teardown

def test_db(db_connection):
    assert db_connection["connected"] is True

# ---------- Parametrize ----------

@pytest.mark.parametrize(
    "input_val, expected",
    [
        ("hello", 5),
        ("", 0),
        ("café", 4),
    ],
)
def test_string_length(input_val, expected):
    assert len(input_val) == expected

# ---------- Markers ----------

@pytest.mark.slow
def test_something_slow():
    import time
    time.sleep(0.1)
    assert True

# Run: pytest -m "not slow"  to skip slow tests
```

### Mocking with unittest.mock and pytest-mock

```python
# services.py
import httpx

def get_weather(city: str) -> dict:
    r = httpx.get(f"https://api.weather.com/{city}")
    r.raise_for_status()
    return r.json()

# test_services.py
from unittest.mock import patch, MagicMock

def test_get_weather_with_patch():
    mock_response = MagicMock()
    mock_response.json.return_value = {"temp": 22, "city": "Paris"}
    mock_response.raise_for_status = MagicMock()

    with patch("services.httpx.get", return_value=mock_response) as mock_get:
        result = get_weather("Paris")
        assert result["temp"] == 22
        mock_get.assert_called_once_with("https://api.weather.com/Paris")

# Using pytest-mock (cleaner syntax, same underlying mock)
def test_get_weather_with_mocker(mocker):
    mock_response = mocker.MagicMock()
    mock_response.json.return_value = {"temp": 22}
    mock_response.raise_for_status = mocker.MagicMock()

    mocker.patch("services.httpx.get", return_value=mock_response)
    result = get_weather("Paris")
    assert result["temp"] == 22
```

### Hypothesis: Property-Based Testing

```python
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Basic: test that reversing a list twice gives back the original
@given(st.lists(st.integers()))
def test_reverse_is_involution(xs):
    assert list(reversed(list(reversed(xs)))) == xs

# Composite strategy for domain objects
@st.composite
def user_strategy(draw):
    return {
        "name": draw(st.text(min_size=1, max_size=50)),
        "age": draw(st.integers(min_value=0, max_value=150)),
        "email": draw(st.emails()),
    }

@given(user_strategy())
def test_user_serialization_roundtrip(user_data):
    from pydantic import BaseModel

    class User(BaseModel):
        name: str
        age: int
        email: str

    user = User(**user_data)
    rebuilt = User.model_validate_json(user.model_dump_json())
    assert rebuilt == user

# Control the number of examples
@settings(max_examples=500)
@given(st.integers(), st.integers())
def test_addition_is_commutative(a, b):
    assert a + b == b + a
```

### Testing Async Code with pytest-asyncio

```python
# test_async.py
import pytest
import asyncio

async def fetch_data(value: int) -> dict:
    await asyncio.sleep(0.01)
    return {"result": value * 2}

@pytest.mark.asyncio
async def test_fetch_data():
    data = await fetch_data(21)
    assert data == {"result": 42}

# Async fixture
@pytest.fixture
async def async_resource():
    resource = {"open": True}
    yield resource
    resource["open"] = False

@pytest.mark.asyncio
async def test_with_async_fixture(async_resource):
    assert async_resource["open"] is True
```

---

## 5. SQLAlchemy 2.0 + asyncpg

```bash
pip install "sqlalchemy[asyncio]" asyncpg alembic
```

### Models with mapped_column (2.0 style)

```python
from datetime import datetime
from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)

class Base(DeclarativeBase):
    pass

class Author(Base):
    __tablename__ = "authors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationship: one author has many books
    books: Mapped[list["Book"]] = relationship(back_populates="author")

class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    price: Mapped[float]
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"))

    author: Mapped["Author"] = relationship(back_populates="books")
```

### 2.0-Style Queries

```python
from sqlalchemy import select, func

# Select with where
stmt = select(Book).where(Book.price > 20.0).order_by(Book.title)

# Join
stmt = (
    select(Book.title, Author.name)
    .join(Author)
    .where(Author.name == "Tolkien")
)

# Aggregation
stmt = (
    select(Author.name, func.count(Book.id).label("book_count"))
    .join(Book)
    .group_by(Author.name)
    .having(func.count(Book.id) > 3)
)
```

### Async Session Usage

```python
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import select

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/mydb"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def create_author(name: str) -> Author:
    async with async_session() as session:
        author = Author(name=name)
        session.add(author)
        await session.commit()
        await session.refresh(author)
        return author

async def get_books_by_author(author_name: str) -> list[Book]:
    async with async_session() as session:
        stmt = (
            select(Book)
            .join(Author)
            .where(Author.name == author_name)
            .order_by(Book.title)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())
```

### Relationships: Eager vs Lazy Loading

```python
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload

# Lazy loading (default) — issues N+1 queries if you access .books in a loop.
# In async, lazy loading raises an error because it would need to do sync I/O.

# Eager loading with selectinload (separate IN query)
stmt = select(Author).options(selectinload(Author.books))

# Eager loading with joinedload (single LEFT JOIN)
stmt = select(Author).options(joinedload(Author.books))

# Usage in async:
async def get_authors_with_books() -> list[Author]:
    async with async_session() as session:
        stmt = select(Author).options(selectinload(Author.books))
        result = await session.execute(stmt)
        return list(result.scalars().unique().all())
```

### Alembic Migrations

#### Setup: Sync vs Async

```bash
# Standard (sync) setup — works with psycopg2, sqlite, etc.
alembic init alembic

# Async setup — generates an env.py that uses async engine (for asyncpg, aiosqlite)
alembic init -t async alembic
```

Both commands create:
- `alembic.ini` — config file with the database URL
- `alembic/` directory with `env.py`, `script.py.mako` (template), and `versions/`

#### Configuring `alembic/env.py`

The key edit: tell Alembic about your models so autogenerate can detect changes.

```python
# alembic/env.py (sync version — key sections to edit)
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# --- ADD THIS: import your models' Base ---
from app.models import Base  # wherever your DeclarativeBase lives

# Alembic Config object (reads alembic.ini)
config = context.config

# Set the database URL programmatically (overrides alembic.ini).
# This is useful when you load the URL from environment variables.
# config.set_main_option("sqlalchemy.url", "postgresql://user:pass@localhost/mydb")

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- SET THIS to your Base.metadata ---
target_metadata = Base.metadata

# The rest of env.py (run_migrations_offline / run_migrations_online)
# is usually fine as generated — no changes needed.
```

For **async** `env.py`, the generated template already uses `create_async_engine`. You just need to set `target_metadata` the same way.

#### Autogenerate Migrations

```bash
# After changing your models (e.g., adding a new table or column):
alembic revision --autogenerate -m "add users table"
```

This generates a file in `alembic/versions/` that looks like:

```python
"""add users table

Revision ID: a1b2c3d4e5f6
Revises: (previous revision or None)
Create Date: 2026-04-03 10:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
```

#### Manual Revision for Data Migrations

Sometimes you need to migrate data, not just schema. Create an empty revision and write raw SQL:

```bash
alembic revision -m "backfill display_name from first + last"
```

```python
"""backfill display_name from first + last

Revision ID: f7e8d9c0b1a2
"""
from alembic import op
import sqlalchemy as sa

revision: str = "f7e8d9c0b1a2"
down_revision: str = "a1b2c3d4e5f6"


def upgrade() -> None:
    # Add the new column
    op.add_column("users", sa.Column("display_name", sa.String(200), nullable=True))

    # Backfill existing rows with raw SQL
    op.execute("""
        UPDATE users
        SET display_name = first_name || ' ' || last_name
        WHERE display_name IS NULL
    """)

    # Now make it non-nullable
    op.alter_column("users", "display_name", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "display_name")
```

#### Key Commands

```bash
# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# Roll back to a specific revision
alembic downgrade a1b2c3d4e5f6

# Show current database revision
alembic current

# Show migration history
alembic history --verbose

# Show pending (unapplied) migrations
alembic history -r current:head
```

#### Common Issues

**"Target database is not up to date"** — your database is at a revision that Alembic does not recognize, or migrations were applied out of order. Fix by stamping:

```bash
# Tell Alembic "the database is at head" without running any migrations.
# Use this when you know the schema is correct but the alembic_version table is wrong.
alembic stamp head
```

**Multiple heads (branch conflict)** — two developers created migrations from the same parent. Alembic will refuse to upgrade:

```bash
# See the problem
alembic heads  # shows 2+ heads

# Create a merge migration
alembic merge heads -m "merge branch migrations"

# Then apply
alembic upgrade head
```

**Autogenerate missing changes** — `--autogenerate` cannot detect everything:

```python
# Autogenerate WILL detect:
#   - Table additions / removals
#   - Column additions / removals
#   - Nullable changes
#   - Index and unique constraint changes
#   - Foreign key changes
#
# Autogenerate WILL NOT detect (you must write these manually):
#   - Table renames (shows as drop + create)
#   - Column renames (shows as drop + add)
#   - Changes to column type (e.g., String(50) -> String(100))
#   - Changes to server_default values
#
# Always review the generated migration before applying it.
```

---

## 6. Typer

```bash
pip install "typer[all]"
```

Typer builds CLIs from type-annotated functions. It uses Click under the hood and integrates with Rich for beautiful output.

### Minimal Example

```python
# cli.py
import typer

app = typer.Typer()

@app.command()
def hello(name: str):
    """Greet someone."""
    print(f"Hello, {name}!")

if __name__ == "__main__":
    app()

# Run: python cli.py Alice
# Output: Hello, Alice!
```

### Commands, Arguments, and Options

```python
import typer
from typing import Annotated
from enum import Enum
from pathlib import Path

app = typer.Typer(help="File processing toolkit.")

class OutputFormat(str, Enum):
    json = "json"
    csv = "csv"
    table = "table"

@app.command()
def convert(
    input_file: Annotated[Path, typer.Argument(help="Input file path")],
    output_format: Annotated[
        OutputFormat, typer.Option("--format", "-f", help="Output format")
    ] = OutputFormat.json,
    verbose: Annotated[
        bool, typer.Option("--verbose", "-v", help="Verbose output")
    ] = False,
    columns: Annotated[
        list[str] | None, typer.Option("--col", help="Columns to include")
    ] = None,
):
    """Convert a file to the specified format."""
    if verbose:
        typer.echo(f"Reading {input_file}...")
    if not input_file.exists():
        typer.echo(f"Error: {input_file} not found", err=True)
        raise typer.Exit(code=1)
    typer.echo(f"Converting to {output_format.value}")

@app.command()
def info(path: Path):
    """Show file info."""
    stat = path.stat()
    typer.echo(f"Size: {stat.st_size:,} bytes")

if __name__ == "__main__":
    app()

# Run:
#   python cli.py convert data.csv --format table -v
#   python cli.py info data.csv
#   python cli.py --help
```

### Rich Output Integration

```python
import typer
from rich.console import Console
from rich.table import Table
from rich.progress import track
import time

app = typer.Typer()
console = Console()

@app.command()
def dashboard():
    """Show a dashboard."""
    table = Table(title="Server Status")
    table.add_column("Service", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Latency")

    table.add_row("API", "[green]UP[/green]", "12ms")
    table.add_row("Database", "[green]UP[/green]", "3ms")
    table.add_row("Cache", "[red]DOWN[/red]", "---")

    console.print(table)

@app.command()
def process(count: int = 100):
    """Process items with a progress bar."""
    for _ in track(range(count), description="Processing..."):
        time.sleep(0.01)
    console.print("[bold green]Done![/bold green]")

if __name__ == "__main__":
    app()
```

---

## 7. structlog

```bash
pip install structlog
```

structlog provides structured, key-value logging that makes log analysis and aggregation far easier than plain text logs.

### Setup and Basic Usage

```python
import structlog

# Configure structlog once at startup
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),  # pretty for development
    ],
    wrapper_class=structlog.make_filtering_bound_logger(0),
)

log = structlog.get_logger()

log.info("server started", host="0.0.0.0", port=8000)
# 2025-01-15T10:30:00Z [info     ] server started     host=0.0.0.0 port=8000

log.warning("slow query", duration_ms=1523, query="SELECT ...")
```

### JSON Output for Production

```python
import structlog

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),  # JSON for production
    ],
    wrapper_class=structlog.make_filtering_bound_logger(0),
)

log = structlog.get_logger()
log.info("request", method="GET", path="/api/users", status=200, duration_ms=45)
# {"method":"GET","path":"/api/users","status":200,"duration_ms":45,
#  "event":"request","level":"info","timestamp":"2025-01-15T10:30:00Z"}
```

### Integration with stdlib logging

```python
import logging
import structlog

# Route all stdlib logging through structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
)

# Set up a stdlib handler that formats via structlog
formatter = structlog.stdlib.ProcessorFormatter(
    processor=structlog.dev.ConsoleRenderer(),
)
handler = logging.StreamHandler()
handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)

# Now both structlog and stdlib logs go through the same pipeline
log = structlog.get_logger("myapp")
log.info("structured log", key="value")

legacy_log = logging.getLogger("some_library")
legacy_log.info("legacy log message")  # also formatted by structlog
```

### Realistic Example: Request Logging in FastAPI

```python
import structlog
from fastapi import FastAPI, Request
import time

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)

app = FastAPI()
log = structlog.get_logger()

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=request.headers.get("x-request-id", "unknown"),
        method=request.method,
        path=request.url.path,
    )
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start

    log.info(
        "request completed",
        status=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )
    return response
```

---

## 8. Polars

```bash
pip install polars
```

Polars is a DataFrame library written in Rust. It is significantly faster than pandas for most operations and has a cleaner API.

### Minimal Example

```python
import polars as pl

df = pl.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Diana"],
    "age": [30, 25, 35, 28],
    "city": ["NYC", "LA", "NYC", "LA"],
    "salary": [100_000, 90_000, 120_000, 95_000],
})

print(df)
# ┌─────────┬─────┬──────┬────────┐
# │ name    ┆ age ┆ city ┆ salary │
# │ ---     ┆ --- ┆ ---  ┆ ---    │
# │ str     ┆ i64 ┆ str  ┆ i64    │
# ╞═════════╪═════╪══════╪════════╡
# │ Alice   ┆ 30  ┆ NYC  ┆ 100000 │
# │ Bob     ┆ 25  ┆ LA   ┆ 90000  │
# │ Charlie ┆ 35  ┆ NYC  ┆ 120000 │
# │ Diana   ┆ 28  ┆ LA   ┆ 95000  │
# └─────────┴─────┴──────┴────────┘
```

### Expressions, Filtering, GroupBy, Joins

```python
import polars as pl

df = pl.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Diana", "Eve"],
    "dept": ["eng", "eng", "sales", "sales", "eng"],
    "salary": [100_000, 90_000, 80_000, 95_000, 110_000],
    "tenure_years": [5, 3, 7, 2, 4],
})

# Filtering
senior_eng = df.filter(
    (pl.col("dept") == "eng") & (pl.col("tenure_years") > 3)
)

# Select with expressions
df.select(
    pl.col("name"),
    pl.col("salary"),
    (pl.col("salary") / 12).round(0).alias("monthly"),
    (pl.col("salary") * 1.05).alias("salary_with_raise"),
)

# GroupBy aggregation
dept_stats = df.group_by("dept").agg(
    pl.col("salary").mean().alias("avg_salary"),
    pl.col("salary").max().alias("max_salary"),
    pl.len().alias("headcount"),
)
print(dept_stats)

# Joins
departments = pl.DataFrame({
    "dept": ["eng", "sales", "marketing"],
    "budget": [500_000, 300_000, 200_000],
})

joined = df.join(departments, on="dept", how="left")
```

### Lazy vs Eager API

```python
import polars as pl

# Eager: executes immediately
result_eager = (
    pl.read_csv("sales.csv")
    .filter(pl.col("amount") > 100)
    .group_by("region")
    .agg(pl.col("amount").sum())
)

# Lazy: builds a query plan, optimizes, then executes at .collect()
result_lazy = (
    pl.scan_csv("sales.csv")         # returns LazyFrame
    .filter(pl.col("amount") > 100)  # predicate pushdown into scan
    .group_by("region")
    .agg(pl.col("amount").sum())
    .sort("amount", descending=True)
    .collect()                        # executes the optimized plan
)

# The lazy API can push filters into the file scan, skip unused columns,
# and reorder operations for performance. Always prefer lazy for large data.
```

### Polars vs pandas Side by Side

```python
# ────────── pandas ──────────
import pandas as pd

pdf = pd.read_csv("data.csv")
result_pd = (
    pdf[pdf["amount"] > 100]
    .groupby("region")["amount"]
    .sum()
    .reset_index()
    .sort_values("amount", ascending=False)
)

# ────────── polars ──────────
import polars as pl

result_pl = (
    pl.scan_csv("data.csv")
    .filter(pl.col("amount") > 100)
    .group_by("region")
    .agg(pl.col("amount").sum())
    .sort("amount", descending=True)
    .collect()
)

# Key differences:
# - Polars uses expressions (pl.col("x")), pandas uses indexing (df["x"])
# - Polars lazy mode optimizes the full query plan
# - Polars has true multithreaded execution (no GIL issues)
# - Polars has no index; rows are positional
# - Polars is stricter about types (no silent int-to-float conversion)
#
# When to use pandas:
# - Ecosystem compatibility (scikit-learn, matplotlib, etc.)
# - Small datasets where speed does not matter
# - You need time-series specific features (resample, rolling with offsets)
#
# When to use polars:
# - Large data (100MB+), performance-sensitive pipelines
# - You want predictable, strict typing
# - Parallel execution matters
# - New projects with no pandas lock-in
```

---

## 9. DuckDB

```bash
pip install duckdb
```

DuckDB is an in-process analytical database (think "SQLite for analytics"). It can query CSV, Parquet, and DataFrames directly with SQL.

### Minimal Example

```python
import duckdb

# Query a CSV file directly — no loading step needed
result = duckdb.sql("SELECT * FROM 'sales.csv' WHERE amount > 100 LIMIT 5")
print(result)

# In-memory table
duckdb.sql("""
    CREATE TABLE users AS
    SELECT * FROM (VALUES
        (1, 'Alice', 30),
        (2, 'Bob', 25),
        (3, 'Charlie', 35)
    ) AS t(id, name, age)
""")
print(duckdb.sql("SELECT * FROM users WHERE age > 28"))
```

### SQL on CSV and Parquet

```python
import duckdb

# Aggregate directly on a Parquet file (columnar pushdown)
result = duckdb.sql("""
    SELECT
        region,
        SUM(amount) AS total,
        COUNT(*) AS num_orders
    FROM 'orders/*.parquet'
    GROUP BY region
    ORDER BY total DESC
""").fetchdf()  # returns a pandas DataFrame

# Glob patterns work — query all parquet files in a directory
```

### Integration with Polars

```python
import polars as pl
import duckdb

# Create a Polars DataFrame
df = pl.DataFrame({
    "product": ["A", "B", "A", "B", "A"],
    "revenue": [100, 200, 150, 250, 300],
})

# Query the Polars DataFrame with SQL
result = duckdb.sql("""
    SELECT product, SUM(revenue) as total_revenue
    FROM df
    GROUP BY product
""").pl()  # .pl() returns a Polars DataFrame

print(result)
# ┌─────────┬───────────────┐
# │ product ┆ total_revenue │
# │ ---     ┆ ---           │
# │ str     ┆ i128          │
# ╞═════════╪═══════════════╡
# │ A       ┆ 550           │
# │ B       ┆ 450           │
# └─────────┴───────────────┘
```

### Integration with pandas

```python
import pandas as pd
import duckdb

pdf = pd.DataFrame({
    "city": ["NYC", "LA", "NYC", "LA", "NYC"],
    "sales": [100, 200, 300, 400, 500],
})

# DuckDB auto-detects pandas DataFrames by variable name
result = duckdb.sql("""
    SELECT city, AVG(sales) as avg_sales
    FROM pdf
    GROUP BY city
""").fetchdf()

print(result)
```

### Realistic Example: Combining Sources

```python
import duckdb
import polars as pl

# Imagine you have sales in Parquet and regions in a Polars DataFrame
regions = pl.DataFrame({
    "region_id": [1, 2, 3],
    "region_name": ["North", "South", "West"],
})

conn = duckdb.connect()
result = conn.sql("""
    SELECT
        r.region_name,
        s.product,
        SUM(s.amount) AS total
    FROM 'sales.parquet' s
    JOIN regions r ON s.region_id = r.region_id
    GROUP BY r.region_name, s.product
    ORDER BY total DESC
    LIMIT 10
""").pl()
```

---

## 10. orjson / msgspec

### orjson

```bash
pip install orjson
```

orjson is the fastest JSON library for Python. It serializes dataclasses, datetimes, and numpy arrays natively.

```python
import orjson
from datetime import datetime, timezone
from dataclasses import dataclass

# Basic usage — note: orjson.dumps returns bytes, not str
data = {"name": "Alice", "scores": [1, 2, 3], "ts": datetime.now(timezone.utc)}
encoded = orjson.dumps(data)
print(encoded)
# b'{"name":"Alice","scores":[1,2,3],"ts":"2025-01-15T10:30:00+00:00"}'

decoded = orjson.loads(encoded)
print(decoded)

# Pretty print
print(orjson.dumps(data, option=orjson.OPT_INDENT_2).decode())

# Dataclass support (no custom encoder needed)
@dataclass
class Event:
    name: str
    timestamp: datetime
    payload: dict

event = Event("deploy", datetime.now(timezone.utc), {"version": "1.2.3"})
print(orjson.dumps(event))

# orjson also supports: numpy arrays, UUID, Enum — all natively
```

### msgspec

```bash
pip install msgspec
```

msgspec is a fast serialization library that supports JSON, MessagePack, TOML, and YAML. It validates data while decoding, similar to Pydantic but faster.

```python
import msgspec
from datetime import datetime

# Define a struct (like a dataclass but faster)
class User(msgspec.Struct):
    name: str
    age: int
    email: str | None = None
    tags: list[str] = []

# Encode to JSON
user = User(name="Alice", age=30, email="alice@example.com")
data = msgspec.json.encode(user)
print(data)
# b'{"name":"Alice","age":30,"email":"alice@example.com","tags":[]}'

# Decode with validation — rejects wrong types
decoded = msgspec.json.decode(data, type=User)
print(decoded)  # User(name='Alice', age=30, email='alice@example.com', tags=[])

# This raises a ValidationError:
try:
    msgspec.json.decode(b'{"name":"Alice","age":"not_a_number"}', type=User)
except msgspec.ValidationError as e:
    print(e)  # Expected `int`, got `str`

# MessagePack (binary, even faster)
packed = msgspec.msgpack.encode(user)
print(len(packed))  # much smaller than JSON
unpacked = msgspec.msgpack.decode(packed, type=User)
```

### Performance Comparison

```python
"""
Typical benchmarks (serializing a list of 1000 dicts with strings, ints, floats):

Library          Serialize    Deserialize
─────────────    ──────────   ───────────
json (stdlib)    1.00x        1.00x        (baseline)
orjson           5-10x        3-5x
msgspec.json     5-12x        4-8x
ujson            2-3x         2-3x

Notes:
- orjson returns bytes; to get str do orjson.dumps(data).decode()
- msgspec also validates types on decode, making it a combined
  serializer + validator (comparable to Pydantic but faster)
- For pure serialization speed: orjson and msgspec are roughly tied
- For validation + serialization: msgspec > Pydantic v2 > Pydantic v1
"""

# Quick benchmark you can run yourself:
import json, orjson, msgspec, time

data = [{"id": i, "name": f"user_{i}", "score": i * 1.1} for i in range(10_000)]

for lib_name, dumps, loads in [
    ("json",   json.dumps,    json.loads),
    ("orjson", orjson.dumps,  orjson.loads),
    ("msgspec", msgspec.json.encode, msgspec.json.decode),
]:
    start = time.perf_counter()
    for _ in range(100):
        encoded = dumps(data)
        loads(encoded)
    elapsed = time.perf_counter() - start
    print(f"{lib_name:10s}: {elapsed:.3f}s")
```

---

## Summary: When to Reach for What

```
Task                         Library
───────────────────────────  ──────────────────
Web API                      FastAPI
Data validation / settings   Pydantic v2
HTTP client                  httpx
Testing                      pytest + Hypothesis
Database ORM                 SQLAlchemy 2.0
CLI tool                     Typer
Structured logging           structlog
Large data / DataFrames      Polars
Ad-hoc SQL analytics         DuckDB
Fast JSON serialization      orjson or msgspec
```
