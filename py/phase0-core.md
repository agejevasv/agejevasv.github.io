# Phase 0: Core Python

Everything here uses modern Python (3.12+). Type hints, f-strings, `list[int]` generics — that's just how Python looks now. No "old way vs new way" comparisons.

---

## 1. Data Structures

### Lists

Ordered, mutable, heterogeneous (but typically homogeneous in practice).

```python
numbers: list[int] = [1, 2, 3, 4, 5]

# Indexing and slicing
first = numbers[0]          # 1
last = numbers[-1]          # 5
middle = numbers[1:4]       # [2, 3, 4]
reversed_ = numbers[::-1]   # [5, 4, 3, 2, 1]

# Mutation
numbers.append(6)           # [1, 2, 3, 4, 5, 6]
numbers.extend([7, 8])      # [1, 2, 3, 4, 5, 6, 7, 8]
numbers.insert(0, 0)        # [0, 1, 2, 3, 4, 5, 6, 7, 8]
popped = numbers.pop()      # 8; numbers is now [0, 1, ..., 7]
numbers.remove(0)           # removes first occurrence of 0

# Sorting
names = ["charlie", "alice", "bob"]
names.sort()                         # in-place: ['alice', 'bob', 'charlie']
sorted_names = sorted(names, key=len)  # new list, sorted by length
```

### Dictionaries

Ordered (insertion order since 3.7), mutable, O(1) lookup by key.

```python
user: dict[str, str | int] = {"name": "Alice", "age": 30, "city": "NYC"}

# Access
name = user["name"]                  # "Alice" — KeyError if missing
age = user.get("age", 0)            # 30 — default if missing
email = user.get("email")           # None — no KeyError

# Mutation
user["email"] = "alice@example.com"  # add or overwrite
del user["city"]                     # remove key
city = user.pop("city", None)       # remove and return, or default

# Iteration
for key in user:                     # iterates over keys
    print(key)
for key, value in user.items():      # key-value pairs
    print(f"{key}: {value}")
for value in user.values():          # values only
    print(value)

# Merging (3.9+)
defaults = {"theme": "dark", "lang": "en"}
overrides = {"lang": "fr", "debug": True}
merged = defaults | overrides        # {'theme': 'dark', 'lang': 'fr', 'debug': True}

# setdefault — get or insert
cache: dict[str, list[int]] = {}
cache.setdefault("scores", []).append(95)  # creates key if missing, then appends
```

### Sets

Unordered, unique elements, O(1) membership test.

```python
tags: set[str] = {"python", "async", "web"}

tags.add("api")
tags.discard("web")          # no error if missing (unlike .remove())

# Set operations
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}
a | b    # union:        {1, 2, 3, 4, 5, 6}
a & b    # intersection:  {3, 4}
a - b    # difference:    {1, 2}
a ^ b    # symmetric diff: {1, 2, 5, 6}

# Membership test — O(1), much faster than list for large collections
if "python" in tags:
    print("found")

# frozenset — immutable, can be used as dict key or in another set
immutable_tags = frozenset(["python", "web"])
```

### Tuples

Ordered, immutable. Use for fixed-size heterogeneous records.

```python
point: tuple[float, float] = (3.0, 4.0)
x, y = point                # unpacking

# Single-element tuple needs trailing comma
singleton: tuple[int] = (42,)

# Named tuples — when you want named fields but tuple semantics
from typing import NamedTuple

class Coordinate(NamedTuple):
    lat: float
    lon: float
    label: str = ""

loc = Coordinate(40.7128, -74.0060, "NYC")
print(loc.lat)       # 40.7128
print(loc[0])        # 40.7128 — still a tuple
lat, lon, _ = loc    # unpacking works
```

### Deques

Double-ended queue. O(1) append/pop on both ends (lists are O(n) for left operations).

```python
from collections import deque

# FIFO queue
queue: deque[str] = deque()
queue.append("first")       # add to right
queue.append("second")
queue.append("third")
item = queue.popleft()       # "first" — O(1)

# Bounded buffer (automatically drops oldest when full)
recent: deque[str] = deque(maxlen=3)
for name in ["a", "b", "c", "d", "e"]:
    recent.append(name)
print(recent)                # deque(['c', 'd', 'e'], maxlen=3)

# Rotate
d = deque([1, 2, 3, 4, 5])
d.rotate(2)                  # [4, 5, 1, 2, 3] — rotate right
d.rotate(-2)                 # [1, 2, 3, 4, 5] — rotate left
```

### Comprehensions

```python
# List comprehension
squares = [x ** 2 for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]

# Dict comprehension
word_lengths = {word: len(word) for word in ["hello", "world", "python"]}
# {'hello': 5, 'world': 5, 'python': 6}

# Set comprehension
unique_lengths = {len(word) for word in ["hi", "hello", "hey"]}
# {2, 3, 5}

# Generator expression (lazy — does not build a list in memory)
total = sum(x ** 2 for x in range(1_000_000))

# Nested comprehension
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [val for row in matrix for val in row]  # [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Comprehension with conditional expression
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
# ['even', 'odd', 'even', 'odd', 'even']
```

### When to Use Which

| Structure | Use When | O(lookup) | O(insert) | Mutable |
|---|---|---|---|---|
| `list` | Ordered collection, random access by index | O(n) | O(1) amortized append | Yes |
| `dict` | Key-value mapping, fast lookup by key | O(1) | O(1) | Yes |
| `set` | Unique membership, set math operations | O(1) | O(1) | Yes |
| `tuple` | Fixed record, dict key, return multiple values | O(n) | Immutable | No |
| `deque` | Queue/stack, fast append/pop both ends | O(n) | O(1) both ends | Yes |
| `frozenset` | Immutable set, use as dict key | O(1) | Immutable | No |

---

## 2. Functions

### Basics: Arguments and Return Types

```python
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

# Calling
greet("Alice")                    # "Hello, Alice!"
greet("Alice", greeting="Hi")    # "Hi, Alice!"
```

### `*args` and `**kwargs`

```python
def log(message: str, *tags: str, **metadata: str | int) -> None:
    """Accept positional tags and keyword metadata."""
    tag_str = ", ".join(tags)
    meta_str = " ".join(f"{k}={v}" for k, v in metadata.items())
    print(f"[{tag_str}] {message} | {meta_str}")

log("deployed", "prod", "v2", region="us-east", replicas=3)
# [prod, v2] deployed | region=us-east replicas=3
```

### Unpacking in Calls

```python
def point(x: float, y: float, z: float) -> str:
    return f"({x}, {y}, {z})"

coords = [1.0, 2.0, 3.0]
point(*coords)                # unpack list as positional args

config = {"x": 1.0, "y": 2.0, "z": 3.0}
point(**config)               # unpack dict as keyword args
```

### First-Class Functions

Functions are objects. You can pass them, return them, store them.

```python
def apply(fn: callable, values: list[int]) -> list[int]:
    return [fn(v) for v in values]

apply(abs, [-1, 2, -3])      # [1, 2, 3]
apply(lambda x: x ** 2, [1, 2, 3])  # [1, 4, 9]
```

### Closures

A closure captures variables from the enclosing scope.

```python
def make_multiplier(factor: int):
    def multiply(x: int) -> int:
        return x * factor    # captures 'factor' from enclosing scope
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5))    # 10
print(triple(5))    # 15
```

**Gotcha — late binding in loops:**

```python
# BUG: all functions capture the same variable 'i', not the value
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])  # [2, 2, 2] — all see final value of i

# FIX: bind the value via default argument
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]
```

### Decorators

A decorator wraps a function with additional behavior. It takes a function and returns a (usually modified) function.

```python
import functools
import time

def timer(fn):
    """Log how long a function takes."""
    @functools.wraps(fn)  # preserves fn.__name__, fn.__doc__, etc.
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{fn.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_add(a: int, b: int) -> int:
    time.sleep(0.1)
    return a + b

slow_add(1, 2)  # prints "slow_add took 0.100Xs", returns 3
```

**Decorator with arguments:**

```python
import functools

def retry(max_attempts: int = 3):
    """Retry a function up to max_attempts times on exception."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_error: Exception | None = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    print(f"  Attempt {attempt}/{max_attempts} failed: {e}")
            raise last_error
        return wrapper
    return decorator

@retry(max_attempts=3)
def flaky_api_call() -> str:
    import random
    if random.random() < 0.7:
        raise ConnectionError("timeout")
    return "success"
```

**Class-based decorator:**

```python
import functools

class CacheResult:
    """Simple memoization decorator using a class."""

    def __init__(self, fn):
        functools.update_wrapper(self, fn)
        self.fn = fn
        self.cache: dict = {}

    def __call__(self, *args):
        if args not in self.cache:
            self.cache[args] = self.fn(*args)
        return self.cache[args]

@CacheResult
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(30))  # 832040 — fast because results are cached
```

### `functools` Essentials

```python
import functools

# --- lru_cache: built-in memoization ---
@functools.lru_cache(maxsize=128)
def expensive_lookup(key: str) -> dict:
    print(f"  Computing {key}...")
    return {"key": key, "value": len(key)}

expensive_lookup("hello")   # computes
expensive_lookup("hello")   # returns cached — no "Computing" printed
expensive_lookup.cache_info()  # CacheInfo(hits=1, misses=1, ...)
expensive_lookup.cache_clear()

# --- partial: fix some arguments ---
from functools import partial

def power(base: int, exponent: int) -> int:
    return base ** exponent

square = partial(power, exponent=2)
cube = partial(power, exponent=3)
print(square(5))    # 25
print(cube(5))      # 125

# --- reduce: fold a sequence ---
from functools import reduce

product = reduce(lambda a, b: a * b, [1, 2, 3, 4, 5])  # 120
```

---

## 3. Iteration

### The Iteration Protocol

Any object with `__iter__` (returns an iterator) and `__next__` (returns next value or raises `StopIteration`) is iterable. This is what `for` loops use.

```python
class Countdown:
    """An iterable that counts down from n to 1."""

    def __init__(self, n: int):
        self.n = n

    def __iter__(self):
        self.current = self.n
        return self

    def __next__(self) -> int:
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

for num in Countdown(5):
    print(num)  # 5, 4, 3, 2, 1

# Works with unpacking, list(), sum(), etc.
print(list(Countdown(3)))  # [3, 2, 1]
```

### Generators

A generator is a function that uses `yield` to produce values lazily, one at a time. It automatically implements the iteration protocol.

```python
def fibonacci():
    """Infinite Fibonacci sequence."""
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# Take first 10
from itertools import islice
first_10 = list(islice(fibonacci(), 10))
print(first_10)  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

```python
def read_large_file(path: str):
    """Process a file line by line without loading it all into memory."""
    with open(path) as f:
        for line in f:
            yield line.strip()

# Memory efficient — only one line in memory at a time
for line in read_large_file("/var/log/syslog"):
    if "error" in line.lower():
        print(line)
```

### `yield from`

Delegates to a sub-generator. Flattens nested iteration.

```python
def flatten(nested: list) -> list:
    """Recursively flatten nested lists."""
    for item in nested:
        if isinstance(item, list):
            yield from flatten(item)  # delegate to recursive call
        else:
            yield item

data = [1, [2, 3], [4, [5, 6]], 7]
print(list(flatten(data)))  # [1, 2, 3, 4, 5, 6, 7]
```

### Generator Expressions vs List Comprehensions

```python
# List comprehension — builds entire list in memory
squares_list = [x ** 2 for x in range(1_000_000)]

# Generator expression — lazy, yields one value at a time
squares_gen = (x ** 2 for x in range(1_000_000))

# Use generator expressions when you only need to iterate once
# and don't need the full list in memory
total = sum(x ** 2 for x in range(1_000_000))  # no list created
```

### `itertools` Essentials

```python
import itertools

# chain — concatenate iterables
combined = list(itertools.chain([1, 2], [3, 4], [5]))
# [1, 2, 3, 4, 5]

# islice — slice any iterable (works on generators, unlike [start:stop])
first_5 = list(itertools.islice(range(100), 5))           # [0, 1, 2, 3, 4]
middle = list(itertools.islice(range(100), 10, 15))        # [10, 11, 12, 13, 14]

# groupby — group consecutive elements (input must be sorted by key)
from itertools import groupby

data = [
    {"dept": "eng", "name": "Alice"},
    {"dept": "eng", "name": "Bob"},
    {"dept": "sales", "name": "Charlie"},
    {"dept": "sales", "name": "Diana"},
]
for dept, members in groupby(data, key=lambda x: x["dept"]):
    names = [m["name"] for m in members]
    print(f"{dept}: {names}")
# eng: ['Alice', 'Bob']
# sales: ['Charlie', 'Diana']

# product — cartesian product
sizes = ["S", "M", "L"]
colors = ["red", "blue"]
combos = list(itertools.product(sizes, colors))
# [('S', 'red'), ('S', 'blue'), ('M', 'red'), ('M', 'blue'), ('L', 'red'), ('L', 'blue')]

# batched (3.12+) — split iterable into fixed-size chunks
from itertools import batched
list(batched(range(10), 3))  # [(0, 1, 2), (3, 4, 5), (6, 7, 8), (9,)]

# count, cycle, repeat — infinite iterators
counter = itertools.count(start=10, step=5)  # 10, 15, 20, 25, ...
cycler = itertools.cycle(["red", "green", "blue"])  # repeats forever

# accumulate — running totals (or any binary function)
running_sum = list(itertools.accumulate([1, 2, 3, 4, 5]))
# [1, 3, 6, 10, 15]
```

### Built-in Iteration Helpers

```python
# enumerate — index + value
for i, name in enumerate(["Alice", "Bob", "Charlie"], start=1):
    print(f"{i}. {name}")

# zip — pair elements from multiple iterables
names = ["Alice", "Bob"]
scores = [95, 87]
for name, score in zip(names, scores):
    print(f"{name}: {score}")

# zip strict (3.10+) — error if lengths differ
# for name, score in zip(names, scores, strict=True): ...

# reversed — iterate in reverse (works on sequences)
for name in reversed(["Alice", "Bob", "Charlie"]):
    print(name)  # Charlie, Bob, Alice

# any / all
numbers = [2, 4, 6, 8]
print(all(n % 2 == 0 for n in numbers))  # True
print(any(n > 5 for n in numbers))       # True

# map / filter (comprehensions usually preferred, but useful with existing functions)
lengths = list(map(len, ["hi", "hello", "hey"]))  # [2, 5, 3]
long_words = list(filter(lambda w: len(w) > 3, ["hi", "hello", "hey"]))  # ['hello']
```

---

## 4. Object-Oriented Programming

### Classes and `__init__`

```python
class BankAccount:
    """A simple bank account."""

    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner
        self.balance = balance
        self._transactions: list[float] = []  # "private" by convention

    def deposit(self, amount: float) -> None:
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        self.balance += amount
        self._transactions.append(amount)

    def withdraw(self, amount: float) -> None:
        if amount > self.balance:
            raise ValueError(f"Insufficient funds: {self.balance:.2f} available")
        self.balance -= amount
        self._transactions.append(-amount)

acct = BankAccount("Alice", 100.0)
acct.deposit(50)
acct.withdraw(30)
print(acct.balance)  # 120.0
```

### Dunder Methods

Dunder (double-underscore) methods let your objects work with built-in operations: `print()`, `==`, `<`, `len()`, `in`, `[]`, `for`, etc.

```python
class Vector:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    # --- Representation ---
    def __repr__(self) -> str:
        """Unambiguous string for debugging. Used by repr() and in the REPL."""
        return f"Vector({self.x}, {self.y})"

    def __str__(self) -> str:
        """Readable string for users. Used by print() and str()."""
        return f"({self.x}, {self.y})"

    # --- Equality and hashing ---
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Vector):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    def __hash__(self) -> int:
        """If you define __eq__, you must define __hash__ for use in sets/dicts."""
        return hash((self.x, self.y))

    # --- Ordering ---
    def __lt__(self, other: "Vector") -> bool:
        """Less than — enables sorted() and < operator."""
        return (self.x, self.y) < (other.x, other.y)

    # --- Arithmetic ---
    def __add__(self, other: "Vector") -> "Vector":
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, scalar: float) -> "Vector":
        return Vector(self.x * scalar, self.y * scalar)

    # --- Container protocol ---
    def __len__(self) -> int:
        return 2

    def __getitem__(self, index: int) -> float:
        match index:
            case 0: return self.x
            case 1: return self.y
            case _: raise IndexError(f"Vector index {index} out of range")

    def __contains__(self, value: float) -> bool:
        return value == self.x or value == self.y

v1 = Vector(1, 2)
v2 = Vector(3, 4)
print(v1 + v2)         # (4, 6)
print(v1 * 3)          # (3, 6)
print(len(v1))          # 2
print(v1[0])            # 1
print(2 in v1)          # True
print(sorted([v2, v1])) # [Vector(1, 2), Vector(3, 4)]

# Works as dict key because __eq__ and __hash__ are defined
vectors = {v1: "origin", v2: "corner"}
```

### `@property`

Properties let you use method logic with attribute syntax.

```python
class Temperature:
    def __init__(self, celsius: float):
        self._celsius = celsius

    @property
    def celsius(self) -> float:
        return self._celsius

    @celsius.setter
    def celsius(self, value: float) -> None:
        if value < -273.15:
            raise ValueError("Below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self) -> float:
        return self._celsius * 9 / 5 + 32

temp = Temperature(100)
print(temp.fahrenheit)    # 212.0
temp.celsius = 0
print(temp.fahrenheit)    # 32.0
# temp.celsius = -300     # raises ValueError
```

### Inheritance and `super()`

```python
class Animal:
    def __init__(self, name: str, sound: str):
        self.name = name
        self.sound = sound

    def speak(self) -> str:
        return f"{self.name} says {self.sound}!"

class Dog(Animal):
    def __init__(self, name: str, breed: str):
        super().__init__(name, sound="woof")  # call parent __init__
        self.breed = breed

    def fetch(self, item: str) -> str:
        return f"{self.name} fetches the {item}"

dog = Dog("Rex", "Labrador")
print(dog.speak())           # Rex says woof!
print(dog.fetch("ball"))     # Rex fetches the ball
print(isinstance(dog, Animal))  # True
```

### Composition Over Inheritance

Inheritance creates tight coupling. Prefer composition (has-a) over inheritance (is-a) when the relationship isn't clearly hierarchical.

```python
class Engine:
    def __init__(self, horsepower: int):
        self.horsepower = horsepower

    def start(self) -> str:
        return f"Engine ({self.horsepower}hp) started"

class GPS:
    def navigate(self, destination: str) -> str:
        return f"Navigating to {destination}"

class Car:
    """Car HAS an engine and GPS. It IS NOT an engine."""

    def __init__(self, model: str, horsepower: int):
        self.model = model
        self.engine = Engine(horsepower)  # composition
        self.gps = GPS()                  # composition

    def drive(self, destination: str) -> str:
        return f"{self.engine.start()} | {self.gps.navigate(destination)}"

car = Car("Sedan", 200)
print(car.drive("airport"))
# Engine (200hp) started | Navigating to airport
```

### Abstract Base Classes (ABCs)

ABCs define interfaces that subclasses must implement. Trying to instantiate a class that hasn't implemented all abstract methods raises `TypeError`.

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

    @abstractmethod
    def perimeter(self) -> float: ...

    def describe(self) -> str:
        return f"{type(self).__name__}: area={self.area():.2f}, perimeter={self.perimeter():.2f}"

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        from math import pi
        return pi * self.radius ** 2

    def perimeter(self) -> float:
        from math import pi
        return 2 * pi * self.radius

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height

    def perimeter(self) -> float:
        return 2 * (self.width + self.height)

# Shape() would raise TypeError: Can't instantiate abstract class
shapes: list[Shape] = [Circle(5), Rectangle(3, 4)]
for s in shapes:
    print(s.describe())
```

### MRO (Method Resolution Order)

When using multiple inheritance, Python uses C3 linearization to determine which method gets called.

```python
class A:
    def greet(self) -> str:
        return "A"

class B(A):
    def greet(self) -> str:
        return "B"

class C(A):
    def greet(self) -> str:
        return "C"

class D(B, C):
    pass

d = D()
print(d.greet())         # "B" — B comes before C in D's bases
print(D.__mro__)
# (D, B, C, A, object) — this is the resolution order
```

The rule: prefer classes earlier in the inheritance list, then go depth-first left-to-right, but never visit a class before all its subclasses.

---

## 5. Error Handling

### `try` / `except` / `else` / `finally`

```python
def divide(a: float, b: float) -> float:
    try:
        result = a / b
    except ZeroDivisionError:
        print("Cannot divide by zero")
        return 0.0
    except TypeError as e:
        print(f"Type error: {e}")
        return 0.0
    else:
        # Runs ONLY if no exception was raised — keep success logic here
        # instead of in the try block, so exceptions from success logic
        # aren't accidentally caught
        print(f"Success: {result}")
        return result
    finally:
        # ALWAYS runs — use for cleanup (close files, connections, etc.)
        print("Division attempted")
```

### Catching Multiple Exception Types

```python
try:
    value = int(input("Enter a number: "))
except (ValueError, TypeError) as e:
    print(f"Invalid input: {e}")
```

### Custom Exceptions

```python
class AppError(Exception):
    """Base exception for the application."""

class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: int):
        self.resource = resource
        self.resource_id = resource_id
        super().__init__(f"{resource} #{resource_id} not found")

class ValidationError(AppError):
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")

# Usage
def get_user(user_id: int) -> dict:
    if user_id <= 0:
        raise ValidationError("user_id", "must be positive")
    # ... database lookup ...
    raise NotFoundError("User", user_id)

try:
    user = get_user(999)
except NotFoundError as e:
    print(f"Not found: {e.resource} #{e.resource_id}")
except ValidationError as e:
    print(f"Validation failed: {e.field} — {e.message}")
except AppError:
    print("Some application error")  # catches any AppError subclass
```

### Exception Chaining (`from`)

```python
import json

def parse_config(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        # Chain the original exception — preserves the full traceback
        raise ValueError(f"Invalid config format") from e

try:
    parse_config("{bad json")
except ValueError as e:
    print(f"Error: {e}")
    print(f"Caused by: {e.__cause__}")
```

### When to Catch vs Propagate

```python
# CATCH when you can handle it meaningfully
def fetch_with_default(url: str) -> str:
    try:
        return http_get(url)
    except ConnectionError:
        return "default value"  # meaningful recovery

# PROPAGATE when you can't — don't do this:
# try:
#     result = compute()
# except Exception:
#     raise  # pointless — just don't catch it

# LOG AND PROPAGATE when you need observability but can't recover
def process(data: bytes) -> dict:
    try:
        return parse(data)
    except ParseError:
        logger.exception("Failed to parse data")  # logs full traceback
        raise  # let the caller decide what to do
```

---

## 6. Context Managers

### The `with` Statement

Context managers guarantee cleanup runs, even if an exception occurs. They're used for files, locks, database connections, network sessions — anything that needs setup/teardown.

```python
# File I/O — file is closed even if an exception occurs
with open("data.txt") as f:
    content = f.read()
# f is now closed

# Multiple context managers
with open("input.txt") as src, open("output.txt", "w") as dst:
    dst.write(src.read())
```

### Writing Context Managers: `__enter__` / `__exit__`

```python
import time

class Timer:
    """Time a block of code."""

    def __enter__(self):
        self.start = time.perf_counter()
        return self  # the value bound by 'as'

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.perf_counter() - self.start
        print(f"Elapsed: {self.elapsed:.4f}s")
        return False  # False = don't suppress exceptions

with Timer() as t:
    time.sleep(0.5)
# prints "Elapsed: 0.500Xs"
print(t.elapsed)  # accessible after the block
```

The `__exit__` method receives exception info. Return `True` to suppress the exception, `False` to let it propagate.

```python
class SuppressErrors:
    """Swallow exceptions of specific types."""

    def __init__(self, *exception_types: type[Exception]):
        self.exception_types = exception_types

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        if exc_type is not None and issubclass(exc_type, self.exception_types):
            print(f"Suppressed: {exc_val}")
            return True  # swallow the exception
        return False      # let other exceptions propagate

with SuppressErrors(FileNotFoundError, PermissionError):
    open("/nonexistent/file.txt")
# prints "Suppressed: ..." and continues execution
```

### `contextlib.contextmanager` — The Easy Way

Most context managers follow the pattern: do setup, yield, do teardown. `@contextmanager` lets you write this without a class.

```python
from contextlib import contextmanager
import os

@contextmanager
def temp_directory(path: str):
    """Create a temp directory, yield, then clean up."""
    os.makedirs(path, exist_ok=True)
    try:
        yield path
    finally:
        import shutil
        shutil.rmtree(path)

with temp_directory("/tmp/work") as d:
    print(f"Working in {d}")
    # ... do work ...
# directory is deleted even if an exception occurred
```

```python
from contextlib import contextmanager
import sqlite3

@contextmanager
def db_transaction(db_path: str):
    """Database connection with automatic commit/rollback."""
    conn = sqlite3.connect(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

with db_transaction("app.db") as conn:
    conn.execute("INSERT INTO users (name) VALUES (?)", ("Alice",))
# auto-committed on success, rolled back on error, connection always closed
```

### `contextlib.asynccontextmanager`

Same pattern for async code.

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def http_session():
    """Async HTTP client with automatic cleanup."""
    import httpx
    client = httpx.AsyncClient()
    try:
        yield client
    finally:
        await client.aclose()

# Usage (inside async function):
# async with http_session() as client:
#     response = await client.get("https://example.com")
```

### `contextlib.suppress` — Cleaner Than Try/Except for Ignoring Errors

```python
from contextlib import suppress

# Instead of:
# try:
#     os.remove("temp.txt")
# except FileNotFoundError:
#     pass

# Use:
with suppress(FileNotFoundError):
    os.remove("temp.txt")
```

---

## 7. Modules and Imports

### How Imports Work

```python
# Import the module
import json
data = json.loads('{"key": "value"}')

# Import specific names
from pathlib import Path
from collections import defaultdict, Counter

# Import with alias
import numpy as np
from datetime import datetime as dt

# Import everything (avoid in production code — pollutes namespace)
# from os.path import *
```

### Packages and `__init__.py`

A package is a directory with an `__init__.py` file (can be empty).

```
myapp/
├── __init__.py          # makes myapp a package
├── models.py
├── services/
│   ├── __init__.py      # makes services a subpackage
│   ├── auth.py
│   └── email.py
└── utils.py
```

```python
# __init__.py controls what's exported when someone does "from myapp import ..."
# myapp/__init__.py
from myapp.models import User, Product
from myapp.utils import format_date

__all__ = ["User", "Product", "format_date"]  # controls "from myapp import *"
```

### Relative vs Absolute Imports

```python
# Inside myapp/services/auth.py:

# Absolute import (preferred — always unambiguous)
from myapp.models import User
from myapp.utils import format_date

# Relative import (useful within a package to avoid hardcoding the package name)
from ..models import User      # .. = parent package (myapp)
from ..utils import format_date
from .email import send_email  # . = current package (services)
```

### Circular Imports

```python
# models.py
from myapp.services import validate_user  # imports services
class User: ...

# services.py
from myapp.models import User  # imports models — CIRCULAR!

# Fix 1: Import inside the function
def validate_user(user_id: int):
    from myapp.models import User  # deferred import
    return User.get(user_id)

# Fix 2: Use TYPE_CHECKING for type hints only
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from myapp.models import User  # only imported by type checkers, not at runtime

def validate_user(user: "User") -> bool: ...

# Fix 3 (best): Restructure to eliminate the cycle
```

### `if __name__ == "__main__"`

```python
# utils.py

def parse_csv(path: str) -> list[dict]:
    """Parse a CSV file into a list of dicts."""
    import csv
    with open(path) as f:
        return list(csv.DictReader(f))

# This block runs only when the file is executed directly,
# not when it's imported by another module.
if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python utils.py <path>")
        sys.exit(1)
    data = parse_csv(sys.argv[1])
    for row in data:
        print(row)
```

---

## 8. Scoping

### The LEGB Rule

Python looks up names in this order: **L**ocal → **E**nclosing → **G**lobal → **B**uilt-in.

```python
x = "global"

def outer():
    x = "enclosing"

    def inner():
        x = "local"
        print(x)  # "local" — found in Local scope

    inner()
    print(x)      # "enclosing" — inner's x is a different variable

outer()
print(x)          # "global" — outer's x is a different variable
```

### `nonlocal` and `global`

```python
def make_counter():
    count = 0

    def increment() -> int:
        nonlocal count   # refer to the enclosing scope's 'count'
        count += 1
        return count

    return increment

counter = make_counter()
print(counter())  # 1
print(counter())  # 2
print(counter())  # 3
```

```python
# global — refer to module-level variable (use sparingly)
_call_count = 0

def tracked_function():
    global _call_count
    _call_count += 1
    return _call_count
```

### Closure Gotcha: Mutable Default Arguments

```python
# BUG: the default list is created ONCE and shared across calls
def append_to(item: int, target: list[int] = []) -> list[int]:
    target.append(item)
    return target

print(append_to(1))  # [1]
print(append_to(2))  # [1, 2] — oops, same list!

# FIX: use None as sentinel
def append_to(item: int, target: list[int] | None = None) -> list[int]:
    if target is None:
        target = []
    target.append(item)
    return target
```

---

## 9. String Handling

### Bytes vs Strings

```python
# str = text (Unicode). bytes = raw binary data.
text: str = "Hello, world!"
data: bytes = b"Hello, world!"

# Encoding: str → bytes
encoded = text.encode("utf-8")       # b'Hello, world!'
encoded_latin = text.encode("latin-1")

# Decoding: bytes → str
decoded = data.decode("utf-8")       # 'Hello, world!'

# This matters for:
# - File I/O: open("file", "rb") gives bytes, open("file", "r") gives str
# - Network: sockets send/receive bytes
# - APIs: HTTP bodies are bytes, you decode them

# Common pattern
response_body: bytes = b'{"name": "Alice"}'
text = response_body.decode("utf-8")
import json
data = json.loads(text)
```

### `pathlib` — Modern File Paths

`pathlib` replaces `os.path` with an object-oriented API.

```python
from pathlib import Path

# Create paths
home = Path.home()                     # /home/alice
project = Path("/srv/myapp")
config = project / "config" / "app.toml"  # / operator joins paths

# Inspect
print(config.name)       # "app.toml"
print(config.stem)       # "app"
print(config.suffix)     # ".toml"
print(config.parent)     # /srv/myapp/config
print(config.exists())   # True/False
print(config.is_file())  # True/False

# Read/write
text = config.read_text()
config.write_text("key = 'value'")
data = Path("image.png").read_bytes()

# Glob
for py_file in project.rglob("*.py"):  # recursive
    print(py_file)

# Create directories
Path("output/reports").mkdir(parents=True, exist_ok=True)

# Iterate directory contents
for item in project.iterdir():
    if item.is_dir():
        print(f"  DIR: {item.name}")
    else:
        print(f"  FILE: {item.name}")
```

---

## 10. Standard Library Essentials

### `collections`

```python
from collections import defaultdict, Counter, deque, ChainMap

# --- defaultdict: dict with automatic default values ---
word_index: defaultdict[str, list[int]] = defaultdict(list)
for i, word in enumerate("the cat sat on the mat".split()):
    word_index[word].append(i)
print(dict(word_index))
# {'the': [0, 4], 'cat': [1], 'sat': [2], 'on': [3], 'mat': [5]}

# --- Counter: count occurrences ---
text = "abracadabra"
freq = Counter(text)
print(freq)                      # Counter({'a': 5, 'b': 2, 'r': 2, 'c': 1, 'd': 1})
print(freq.most_common(2))      # [('a', 5), ('b', 2)]

# Counter arithmetic
c1 = Counter(a=3, b=1)
c2 = Counter(a=1, b=2)
print(c1 + c2)    # Counter({'a': 4, 'b': 3})
print(c1 - c2)    # Counter({'a': 2}) — drops zero/negative counts

# --- ChainMap: layered dict lookup ---
defaults = {"theme": "dark", "lang": "en", "timeout": 30}
user_prefs = {"lang": "fr"}
env_config = {"timeout": 60}

config = ChainMap(env_config, user_prefs, defaults)
print(config["theme"])    # "dark" — from defaults
print(config["lang"])     # "fr" — from user_prefs (found first)
print(config["timeout"])  # 60 — from env_config (found first)
```

### `functools` (continued)

```python
from functools import total_ordering

# --- total_ordering: generate comparison methods from __eq__ + one of __lt__ etc. ---
@total_ordering
class Version:
    def __init__(self, major: int, minor: int, patch: int):
        self.major = major
        self.minor = minor
        self.patch = patch

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return (self.major, self.minor, self.patch) == (other.major, other.minor, other.patch)

    def __lt__(self, other: "Version") -> bool:
        return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

    def __repr__(self) -> str:
        return f"v{self.major}.{self.minor}.{self.patch}"

versions = [Version(1, 2, 0), Version(1, 0, 3), Version(2, 0, 0)]
print(sorted(versions))  # [v1.0.3, v1.2.0, v2.0.0]
# total_ordering auto-generates __le__, __gt__, __ge__ from __eq__ + __lt__
```

### `re` — Regular Expressions

```python
import re

# Basic matching
if re.match(r"^\d{3}-\d{4}$", "555-1234"):
    print("Valid phone")

# Search (finds first match anywhere in string)
text = "Order #12345 placed on 2026-03-15"
if m := re.search(r"#(\d+)", text):
    print(f"Order number: {m.group(1)}")  # 12345

# Find all
emails = re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", "Contact alice@x.com or bob@y.org")
print(emails)  # ['alice@x.com', 'bob@y.org']

# Substitution
cleaned = re.sub(r"\s+", " ", "too   many    spaces")
print(cleaned)  # "too many spaces"

# Compiled pattern (faster when reusing)
LOG_PATTERN = re.compile(r"(\d{4}-\d{2}-\d{2}) (\w+) (.+)")

for line in ["2026-03-15 ERROR disk full", "2026-03-15 INFO started"]:
    if m := LOG_PATTERN.match(line):
        date, level, message = m.groups()
        print(f"[{level}] {date}: {message}")

# Named groups
pattern = re.compile(r"(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})")
if m := pattern.match("2026-03-15"):
    print(m.group("year"))   # 2026
    print(m.groupdict())     # {'year': '2026', 'month': '03', 'day': '15'}
```

### `datetime` and `zoneinfo`

```python
from datetime import datetime, timedelta, date, time
from zoneinfo import ZoneInfo

# Current time
now = datetime.now()                                 # naive (no timezone)
now_utc = datetime.now(ZoneInfo("UTC"))             # timezone-aware

# Specific datetime
launch = datetime(2026, 6, 15, 14, 30, tzinfo=ZoneInfo("America/New_York"))

# Formatting and parsing
formatted = now.strftime("%Y-%m-%d %H:%M:%S")       # "2026-03-15 10:30:00"
parsed = datetime.strptime("2026-03-15", "%Y-%m-%d")

# Arithmetic
tomorrow = now + timedelta(days=1)
week_ago = now - timedelta(weeks=1)
duration = tomorrow - now                             # timedelta object
print(duration.total_seconds())                       # 86400.0

# Timezone conversion
eastern = ZoneInfo("America/New_York")
pacific = ZoneInfo("America/Los_Angeles")
meeting_eastern = datetime(2026, 3, 15, 14, 0, tzinfo=eastern)
meeting_pacific = meeting_eastern.astimezone(pacific)
print(meeting_pacific)  # 2026-03-15 11:00:00-07:00

# Date and time separately
today = date.today()
noon = time(12, 0, 0)
combined = datetime.combine(today, noon)

# ISO format (best for serialization)
iso_str = now_utc.isoformat()                        # "2026-03-15T10:30:00+00:00"
back = datetime.fromisoformat(iso_str)
```

### Practical Example: Combining stdlib Tools

```python
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
import re

def analyze_log(log_path: str) -> dict:
    """Analyze a log file: count errors by hour and module."""
    pattern = re.compile(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (\w+) \[(.+?)\] (.+)")
    error_counts = Counter()
    errors_by_hour: defaultdict[int, list[str]] = defaultdict(list)

    for line in Path(log_path).read_text().splitlines():
        if m := pattern.match(line):
            timestamp_str, level, module, message = m.groups()
            if level == "ERROR":
                ts = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                error_counts[module] += 1
                errors_by_hour[ts.hour].append(f"[{module}] {message}")

    return {
        "top_error_modules": error_counts.most_common(5),
        "errors_by_hour": dict(errors_by_hour),
        "total_errors": sum(error_counts.values()),
    }
```

---

## Quick Reference

| Topic | Key Concept | When You Need It |
|---|---|---|
| `list` / `dict` / `set` | Core data structures, comprehensions | Everywhere |
| `*args` / `**kwargs` | Variable arguments | Writing flexible functions, decorators |
| Decorators | `@functools.wraps`, decorator factories | Cross-cutting concerns (logging, retries, caching) |
| Generators | `yield`, lazy evaluation | Large data, pipelines, memory efficiency |
| `itertools` | `chain`, `islice`, `groupby`, `batched` | Efficient iteration patterns |
| Dunders | `__repr__`, `__eq__`, `__hash__`, `__lt__` | Making objects work with Python builtins |
| ABCs | `@abstractmethod`, interface contracts | Libraries and plugin systems |
| `try`/`except`/`else`/`finally` | Error handling flow | Anywhere errors can occur |
| Context managers | `with`, `@contextmanager` | Resource management (files, connections, locks) |
| `pathlib` | Object-oriented file paths | All file operations |
| `collections` | `defaultdict`, `Counter`, `deque` | Data aggregation and special-purpose containers |
| `re` | Pattern matching on strings | Parsing, validation, extraction |
| `datetime` / `zoneinfo` | Timezone-aware date handling | Timestamps, scheduling, formatting |
