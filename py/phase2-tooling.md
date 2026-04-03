# Phase 2: Environment Management & Tooling

Modern Python development has consolidated around a handful of fast, Rust-based tools that replace an entire generation of slower, fragmented utilities. This phase covers the pillars of a modern Python project: **uv** for environment and package management, **Ruff** for linting and formatting, **pyproject.toml** as the single configuration file, **mypy** for type checking, **pre-commit** for automated git hooks, **Docker** for containerization, and the basics of **packaging**, **publishing**, and **security**. By the end, you will set up a complete project from zero and know how to ship it.

---

## Table of Contents

1. [uv — The Universal Python Manager](#1-uv--the-universal-python-manager)
2. [Ruff — Linting and Formatting](#2-ruff--linting-and-formatting)
3. [pyproject.toml — The Single Config File](#3-pyprojecttoml--the-single-config-file)
4. [Complete Project Setup Walkthrough](#4-complete-project-setup-walkthrough)
5. [mypy — Type Checking](#5-mypy--type-checking)
6. [pre-commit — Git Hooks](#6-pre-commit--git-hooks)
7. [Docker — Containerizing Python Apps](#7-docker--containerizing-python-apps)
8. [Packaging & Publishing](#8-packaging--publishing)
9. [Security Basics](#9-security-basics)

---

## 1. uv — The Universal Python Manager

`uv` is a single binary written in Rust that replaces **pip**, **venv**, **pyenv**, **pip-tools**, and **pipx**. It is 10-100x faster than the tools it replaces.

### 1.1 Installation

```bash
# The recommended way (Linux / macOS)
curl -LsSf https://astral.sh/uv/install.sh | sh

# With Homebrew
brew install uv

# With pip (if you must)
pip install uv

# Verify
uv --version
```

After installation, ensure `~/.local/bin` (or the path the installer reports) is on your `PATH`.

### 1.2 Managing Python Versions

uv can install and manage Python interpreters directly. You no longer need pyenv.

```bash
# List available Python versions
uv python list

# Install a specific version
uv python install 3.13

# Install multiple versions
uv python install 3.11 3.12 3.13

# See what is installed
uv python list --only-installed

# Pin a version for the current directory (writes .python-version)
uv python pin 3.13
```

The interpreters are stored in `~/.local/share/uv/python/` and managed entirely by uv.

### 1.3 Project Creation with `uv init`

```bash
# Create a new project (application, not a library)
uv init my-web-app
cd my-web-app
```

This generates the following structure:

```
my-web-app/
├── .python-version      # e.g. "3.13"
├── README.md
├── hello.py             # starter script
└── pyproject.toml       # project metadata and dependencies
```

The generated `pyproject.toml` looks like this:

```toml
[project]
name = "my-web-app"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = []
```

For a **library** (intended to be published on PyPI), use:

```bash
uv init --lib my-library
```

This creates a `src/my_library/__init__.py` layout and adds a `[build-system]` table.

For a **packaged application** (an app with a proper package structure):

```bash
uv init --package my-cli-app
```

This creates a `src/` layout with a `__main__.py` and a `[project.scripts]` entry point.

### 1.4 Adding and Removing Dependencies

```bash
# Add a runtime dependency
uv add requests
uv add "sqlalchemy>=2.0"
uv add flask jinja2       # multiple at once

# Add a development-only dependency
uv add --dev pytest
uv add --dev ruff mypy
uv add --dev pytest-cov hypothesis

# Add an optional dependency group
uv add --group docs mkdocs mkdocs-material

# Remove a dependency
uv remove requests
uv remove --dev mypy
```

Every `uv add` or `uv remove` command does three things:

1. Updates `pyproject.toml`
2. Resolves all dependencies and updates `uv.lock`
3. Installs (or uninstalls) packages in the project virtual environment (`.venv/`)

After running `uv add requests` and `uv add --dev pytest`, your `pyproject.toml` will contain:

```toml
[project]
name = "my-web-app"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = [
    "requests>=2.32.3",
]

[dependency-groups]
dev = [
    "pytest>=8.3.5",
]
```

### 1.5 The Lockfile and `uv sync`

`uv.lock` is a cross-platform lockfile that pins every transitive dependency to an exact version and records hashes. It is **always committed to version control**.

```bash
# Regenerate the lockfile from pyproject.toml (rarely needed manually)
uv lock

# Install exactly what the lockfile says — reproducible across machines
uv sync

# Sync including dev dependencies (default)
uv sync

# Sync without dev dependencies (for production / CI)
uv sync --no-dev

# Sync a specific extra/group
uv sync --group docs

# Upgrade a single package (re-resolve it)
uv lock --upgrade-package requests
uv sync
```

The typical CI workflow is:

```bash
uv sync --frozen   # fail if lockfile is out of date with pyproject.toml
```

### 1.6 Running Commands with `uv run`

`uv run` executes a command inside the project's virtual environment. You never need to manually activate the venv.

```bash
# Run a Python script
uv run python hello.py

# Run pytest
uv run pytest

# Run pytest with arguments
uv run pytest tests/ -v --tb=short

# Run any installed CLI tool
uv run ruff check src/

# Run a module
uv run python -m http.server 8000

# One-off script with an inline dependency (no project needed)
uv run --with rich python -c "from rich import print; print('[bold green]Hello![/]')"
```

`uv run` will automatically create the `.venv/` and install dependencies if they are missing. It is the primary way you interact with your project.

### 1.7 Compatibility Mode: `uv pip`

For migration or scripts that expect pip-like commands:

```bash
# Works like pip install, but faster
uv pip install requests
uv pip install -r requirements.txt

# Freeze current environment
uv pip freeze

# Compile a requirements.txt from pyproject.toml (like pip-compile)
uv pip compile pyproject.toml -o requirements.txt

# Uninstall
uv pip uninstall requests
```

These commands operate on the active virtual environment (or `.venv/` in the current directory). They do **not** update `pyproject.toml` or `uv.lock`. Prefer `uv add` / `uv sync` for project work.

### 1.8 Global CLI Tools with `uv tool`

This replaces `pipx`. Install command-line tools into isolated environments:

```bash
# Install a CLI tool globally
uv tool install ruff
uv tool install httpie
uv tool install cookiecutter

# Run a tool without installing it permanently
uvx ruff check .         # uvx is shorthand for "uv tool run"
uvx black --check .
uvx cowsay "hello"

# List installed tools
uv tool list

# Upgrade a tool
uv tool upgrade ruff

# Uninstall
uv tool uninstall httpie
```

Tools installed with `uv tool install` are available globally on your `PATH` without polluting any project environment.

### 1.9 Workspaces for Monorepos

A workspace lets you manage multiple related packages in one repository. The root `pyproject.toml` declares the members:

```toml
# Root pyproject.toml
[tool.uv.workspace]
members = [
    "packages/core",
    "packages/api",
    "packages/cli",
]
```

Directory structure:

```
monorepo/
├── pyproject.toml            # workspace root
├── uv.lock                   # single lockfile for everything
├── packages/
│   ├── core/
│   │   ├── pyproject.toml    # name = "myapp-core"
│   │   └── src/myapp_core/
│   ├── api/
│   │   ├── pyproject.toml    # name = "myapp-api", depends on myapp-core
│   │   └── src/myapp_api/
│   └── cli/
│       ├── pyproject.toml
│       └── src/myapp_cli/
```

In `packages/api/pyproject.toml`, you reference a workspace sibling:

```toml
[project]
name = "myapp-api"
dependencies = [
    "myapp-core",       # resolved from workspace, not PyPI
    "fastapi>=0.110",
]

[tool.uv.sources]
myapp-core = { workspace = true }
```

Then `uv sync` from the workspace root installs everything with a single lockfile.

### 1.10 Full Workflow from Scratch

```bash
# 1. Install Python
uv python install 3.13

# 2. Create project
uv init my-project
cd my-project

# 3. Pin Python version
uv python pin 3.13

# 4. Add dependencies
uv add fastapi uvicorn
uv add --dev pytest ruff mypy

# 5. See what was generated
ls -la
# .python-version  .venv/  README.md  hello.py  pyproject.toml  uv.lock

# 6. Write some code
cat > hello.py << 'PYEOF'
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello, World!"}
PYEOF

# 7. Run it
uv run uvicorn hello:app --reload

# 8. Run tests
uv run pytest

# 9. Lint and format
uv run ruff check .
uv run ruff format .

# 10. Commit the lockfile
git init && git add . && git commit -m "Initial project setup"
```

---

## 2. Ruff — Linting and Formatting

Ruff is a single Rust binary that replaces **flake8**, **Black**, **isort**, **pyflakes**, **pycodestyle**, **pydocstyle**, **autoflake**, and dozens of flake8 plugins. It runs 10-100x faster.

### 2.1 Installation

```bash
# Via uv (recommended in a project)
uv add --dev ruff

# As a global tool
uv tool install ruff

# Verify
ruff --version
```

### 2.2 Linting with `ruff check`

```bash
# Lint the entire project
ruff check .

# Lint a specific file or directory
ruff check src/myapp/

# Show the rule code and explanation for each violation
ruff check . --output-format=full

# Explain a specific rule
ruff rule E501
ruff rule UP035
```

Example output:

```
src/myapp/main.py:3:1: F401 [*] `os` imported but unused
src/myapp/main.py:15:89: E501 Line too long (102 > 88)
src/myapp/utils.py:7:5: UP035 [*] `typing.Dict` is deprecated, use `dict` instead
Found 3 errors.
[*] 2 fixable with `--fix`.
```

### 2.3 Auto-fixing with `ruff check --fix`

```bash
# Fix all auto-fixable violations
ruff check --fix .

# Preview what would be fixed without changing files
ruff check --fix --diff .

# Fix unsafe fixes too (may change behavior — review the diff)
ruff check --fix --unsafe-fixes .
```

### 2.4 Formatting with `ruff format`

Ruff's formatter is a drop-in replacement for Black. The output is nearly identical.

```bash
# Format all files
ruff format .

# Check formatting without modifying files (useful in CI)
ruff format --check .

# Show what would change
ruff format --diff .

# Format a single file
ruff format src/myapp/main.py
```

### 2.5 Configuration in pyproject.toml

All Ruff configuration lives in `pyproject.toml` under the `[tool.ruff]` table.

```toml
[tool.ruff]
# Target Python version (affects which rules and syntax upgrades apply)
target-version = "py313"

# Maximum line length
line-length = 88

# Directories to completely exclude from linting/formatting
exclude = [
    ".venv",
    "migrations",
    "__pycache__",
]

[tool.ruff.lint]
# Rule selection
# See all rules: https://docs.astral.sh/ruff/rules/
select = [
    "E",     # pycodestyle errors
    "W",     # pycodestyle warnings
    "F",     # pyflakes
    "I",     # isort (import sorting)
    "N",     # pep8-naming
    "UP",    # pyupgrade (modernize syntax)
    "B",     # flake8-bugbear (common bugs)
    "SIM",   # flake8-simplify
    "ANN",   # flake8-annotations (type hint enforcement)
    "S",     # flake8-bandit (security)
    "RUF",   # Ruff-specific rules
]

# Rules to ignore globally
ignore = [
    "ANN101",  # missing type annotation for self
    "ANN102",  # missing type annotation for cls
    "S101",    # use of assert (fine in tests)
    "E501",    # line length (let the formatter handle it)
]

# Allow autofix for all enabled rules
fixable = ["ALL"]

[tool.ruff.lint.per-file-ignores]
# Tests can use assert, magic values, etc.
"tests/**/*.py" = ["S101", "ANN", "PLR2004"]
# __init__.py files can have unused imports (re-exports)
"__init__.py" = ["F401"]

[tool.ruff.lint.isort]
# isort configuration
known-first-party = ["myapp"]
force-single-line = false
lines-after-imports = 2

[tool.ruff.lint.pydocstyle]
convention = "google"    # or "numpy" or "pep257"

[tool.ruff.format]
# Formatting options
quote-style = "double"            # or "single"
indent-style = "space"            # or "tab"
skip-magic-trailing-comma = false
line-ending = "auto"              # or "lf" or "crlf"
docstring-code-format = true      # format code blocks inside docstrings
```

### 2.6 Rule Categories Quick Reference

| Prefix | Source              | What It Checks                      |
|--------|---------------------|-------------------------------------|
| `E`/`W`| pycodestyle         | Style errors and warnings           |
| `F`    | Pyflakes            | Unused imports, undefined names     |
| `I`    | isort               | Import sorting                      |
| `UP`   | pyupgrade           | Modernize to newer Python syntax    |
| `B`    | flake8-bugbear      | Likely bugs and design problems     |
| `SIM`  | flake8-simplify     | Simplifiable code patterns          |
| `N`    | pep8-naming         | Naming conventions                  |
| `S`    | flake8-bandit       | Security issues                     |
| `ANN`  | flake8-annotations  | Missing type annotations            |
| `RUF`  | Ruff-specific       | Ruff's own rules                    |
| `D`    | pydocstyle          | Docstring conventions               |
| `PT`   | flake8-pytest-style | Pytest best practices               |
| `C4`   | flake8-comprehensions| Unnecessary list/dict/set calls    |
| `PLR`  | Pylint refactor     | Code complexity, magic values       |

### 2.7 Editor Integration

**VS Code**: Install the "Ruff" extension (`charliermarsh.ruff`). Add to `.vscode/settings.json`:

```json
{
    "[python]": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "charliermarsh.ruff",
        "editor.codeActionsOnSave": {
            "source.fixAll.ruff": "explicit",
            "source.organizeImports.ruff": "explicit"
        }
    }
}
```

**Neovim** (via `nvim-lspconfig`): Ruff ships as an LSP server.

```lua
require('lspconfig').ruff.setup({})
```

**Pre-commit hook** (`.pre-commit-config.yaml`):

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.9.6
    hooks:
      - id: ruff          # linting
        args: [--fix]
      - id: ruff-format   # formatting
```

### 2.8 Example Session

```bash
$ cat src/myapp/example.py
import os
import json
from typing import Dict, List
import requests

def get_data(url: str) -> Dict[str, List[int]]:
    x  = requests.get(url)
    data = json.loads(x.text)
    return data

$ ruff check src/myapp/example.py
src/myapp/example.py:1:8: F401 [*] `os` imported but unused
src/myapp/example.py:3:20: UP035 [*] `typing.Dict` is deprecated, use `dict`
src/myapp/example.py:3:26: UP035 [*] `typing.List` is deprecated, use `list`
Found 3 errors.
[*] 3 fixable with `--fix`.

$ ruff check --fix src/myapp/example.py
Found 3 errors (3 fixed, 0 remaining).

$ cat src/myapp/example.py
import json

import requests


def get_data(url: str) -> dict[str, list[int]]:
    x = requests.get(url)
    data = json.loads(x.text)
    return data
```

Ruff removed the unused import, sorted imports, added the blank line between stdlib and third-party imports, and modernized `Dict`/`List` to built-in generics.

---

## 3. pyproject.toml — The Single Config File

`pyproject.toml` is the standard configuration file for Python projects, defined by PEP 517, PEP 518, and PEP 621. It replaces `setup.py`, `setup.cfg`, `requirements.txt`, `MANIFEST.in`, and tool-specific config files.

### 3.1 The `[project]` Table (PEP 621)

This is the standardized metadata table. Every field here is defined by the Python packaging standards, not by any specific tool.

```toml
[project]
# Required fields
name = "my-web-app"
version = "0.1.0"

# Recommended fields
description = "A high-performance API for widget management"
readme = "README.md"
license = "MIT"
requires-python = ">=3.12"
authors = [
    { name = "Alice Smith", email = "alice@example.com" },
    { name = "Bob Jones", email = "bob@example.com" },
]
keywords = ["api", "widgets", "fastapi"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Framework :: FastAPI",
    "Programming Language :: Python :: 3.13",
    "Typing :: Typed",
]

# Runtime dependencies
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "sqlalchemy>=2.0",
    "pydantic>=2.0,<3",
    "httpx>=0.27",
]

# Project URLs (shown on PyPI)
[project.urls]
Homepage = "https://github.com/alice/my-web-app"
Documentation = "https://my-web-app.readthedocs.io"
Repository = "https://github.com/alice/my-web-app"
"Bug Tracker" = "https://github.com/alice/my-web-app/issues"
```

### 3.2 The `[build-system]` Table

Declares which build backend to use. Required if you want to build distributable packages (wheels/sdists).

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

Common build backends:

| Backend       | `requires`                     | `build-backend`              |
|---------------|--------------------------------|------------------------------|
| Hatchling     | `["hatchling"]`                | `"hatchling.build"`          |
| setuptools    | `["setuptools>=75"]`           | `"setuptools.build_meta"`    |
| flit-core     | `["flit_core>=3.4"]`           | `"flit_core.buildapi"`       |
| maturin       | `["maturin>=1.0"]`             | `"maturin"`                  |

For applications that are never published to PyPI, you can omit this table entirely.

### 3.3 CLI Entry Points: `[project.scripts]`

Define commands that become available when the package is installed:

```toml
[project.scripts]
# "myapp" command will call main() in src/myapp/cli.py
myapp = "myapp.cli:main"
myapp-worker = "myapp.worker:start"
```

After `uv sync`, you can run:

```bash
uv run myapp --help
uv run myapp-worker
```

There is also `[project.gui-scripts]` (for GUI applications on Windows) and `[project.entry-points]` (for plugin systems):

```toml
[project.entry-points."myapp.plugins"]
csv = "myapp.plugins.csv:CsvPlugin"
json = "myapp.plugins.json:JsonPlugin"
```

### 3.4 Optional Dependencies (Extras)

Groups of optional dependencies that users can install selectively:

```toml
[project.optional-dependencies]
postgres = [
    "psycopg[binary]>=3.1",
    "asyncpg>=0.29",
]
redis = [
    "redis>=5.0",
]
all = [
    "my-web-app[postgres,redis]",    # composite extra
]
```

Users install them with:

```bash
uv add "my-web-app[postgres]"
# or
pip install "my-web-app[postgres,redis]"
```

### 3.5 Development Dependency Groups

PEP 735 dependency groups (used by uv):

```toml
[dependency-groups]
dev = [
    "pytest>=8.0",
    "pytest-cov>=6.0",
    "pytest-asyncio>=0.24",
    "ruff>=0.9",
    "mypy>=1.14",
    "pre-commit>=4.0",
]
docs = [
    "mkdocs>=1.6",
    "mkdocs-material>=9.5",
]
```

### 3.6 Tool Configuration Tables

Many tools read their configuration from `pyproject.toml`:

```toml
# ── Ruff ──────────────────────────────────────────────
[tool.ruff]
target-version = "py313"
line-length = 88

[tool.ruff.lint]
select = ["E", "W", "F", "I", "UP", "B", "SIM", "RUF"]

# ── Pytest ────────────────────────────────────────────
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
addopts = "-ra -q --strict-markers --tb=short"
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks integration tests",
]
asyncio_mode = "auto"

# ── Mypy ──────────────────────────────────────────────
[tool.mypy]
python_version = "3.13"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false

# ── Coverage ──────────────────────────────────────────
[tool.coverage.run]
source = ["src/myapp"]
branch = true

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.",
]
```

### 3.7 Complete Realistic pyproject.toml

Here is a full, production-grade file you might find in a real project:

```toml
[project]
name = "widgetapi"
version = "1.2.0"
description = "A REST API for managing widgets"
readme = "README.md"
license = "MIT"
requires-python = ">=3.12"
authors = [
    { name = "Alice Smith", email = "alice@example.com" },
]
classifiers = [
    "Development Status :: 4 - Beta",
    "Framework :: FastAPI",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
    "Typing :: Typed",
]
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "sqlalchemy>=2.0",
    "alembic>=1.14",
    "pydantic>=2.0,<3",
    "pydantic-settings>=2.0",
    "httpx>=0.27",
    "structlog>=24.0",
]

[project.optional-dependencies]
postgres = ["psycopg[binary]>=3.1"]
redis = ["redis>=5.0"]

[project.urls]
Repository = "https://github.com/alice/widgetapi"
Documentation = "https://widgetapi.readthedocs.io"

[project.scripts]
widgetapi = "widgetapi.cli:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

# ── Development dependencies ──────────────────────────
[dependency-groups]
dev = [
    "pytest>=8.0",
    "pytest-cov>=6.0",
    "pytest-asyncio>=0.24",
    "httpx>=0.27",
    "ruff>=0.9",
    "mypy>=1.14",
    "pre-commit>=4.0",
]

# ── Tool configuration ────────────────────────────────
[tool.ruff]
target-version = "py312"
line-length = 88

[tool.ruff.lint]
select = ["E", "W", "F", "I", "UP", "B", "SIM", "N", "RUF"]
ignore = ["E501"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101", "ANN"]
"__init__.py" = ["F401"]

[tool.ruff.lint.isort]
known-first-party = ["widgetapi"]

[tool.ruff.format]
quote-style = "double"
docstring-code-format = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-ra -q --strict-markers --tb=short"
asyncio_mode = "auto"
markers = [
    "slow: marks tests as slow",
    "integration: marks integration tests",
]

[tool.mypy]
python_version = "3.13"
strict = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false

[tool.coverage.run]
source = ["src/widgetapi"]
branch = true

[tool.coverage.report]
fail_under = 80
show_missing = true
```

---

## 4. Complete Project Setup Walkthrough

This section walks through creating a real project from zero. Every command and every file is shown.

### Step 1: Create the project

```bash
$ uv init --package widgetapi
$ cd widgetapi
$ uv python pin 3.13
```

The `--package` flag creates a proper `src/` layout with an entry point. The generated tree:

```
widgetapi/
├── .python-version
├── README.md
├── pyproject.toml
└── src/
    └── widgetapi/
        └── __init__.py
```

### Step 2: Add dependencies

```bash
$ uv add fastapi "uvicorn[standard]" pydantic
$ uv add --dev pytest pytest-cov ruff mypy httpx
```

Output:

```
Resolved 24 packages in 320ms
Installed 24 packages in 48ms
 + annotated-types==0.7.0
 + anyio==4.8.0
 + fastapi==0.115.8
 + pydantic==2.10.6
 + ...
```

### Step 3: Edit pyproject.toml

Update the file to include tool configuration:

```toml
[project]
name = "widgetapi"
version = "0.1.0"
description = "A simple widget API"
readme = "README.md"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115.8",
    "pydantic>=2.10.6",
    "uvicorn[standard]>=0.30",
]

[project.scripts]
widgetapi = "widgetapi:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[dependency-groups]
dev = [
    "httpx>=0.27",
    "mypy>=1.14",
    "pytest>=8.3",
    "pytest-cov>=6.0",
    "ruff>=0.9",
]

[tool.ruff]
target-version = "py313"
line-length = 88

[tool.ruff.lint]
select = ["E", "W", "F", "I", "UP", "B", "SIM", "RUF"]

[tool.ruff.format]
docstring-code-format = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-ra -q --tb=short"

[tool.coverage.run]
source = ["src/widgetapi"]
branch = true
```

### Step 4: Write the application code

**`src/widgetapi/__init__.py`**:

```python
"""WidgetAPI — a simple widget management service."""

from widgetapi.app import create_app

__all__ = ["create_app"]


def main() -> None:
    """Entry point for the widgetapi CLI command."""
    import uvicorn

    uvicorn.run("widgetapi.app:create_app", factory=True, reload=True)
```

**`src/widgetapi/models.py`**:

```python
"""Pydantic models for the widget domain."""

from pydantic import BaseModel, Field


class Widget(BaseModel):
    """A widget with a name and quantity."""

    id: int
    name: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=0, default=0)


class WidgetCreate(BaseModel):
    """Payload for creating a new widget."""

    name: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=0, default=0)
```

**`src/widgetapi/app.py`**:

```python
"""FastAPI application factory."""

from fastapi import FastAPI, HTTPException

from widgetapi.models import Widget, WidgetCreate

# In-memory store for demonstration
_widgets: dict[int, Widget] = {}
_next_id: int = 1


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(title="WidgetAPI", version="0.1.0")

    @app.get("/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/widgets", response_model=list[Widget])
    def list_widgets() -> list[Widget]:
        return list(_widgets.values())

    @app.post("/widgets", response_model=Widget, status_code=201)
    def create_widget(payload: WidgetCreate) -> Widget:
        global _next_id  # noqa: PLW0603
        widget = Widget(id=_next_id, **payload.model_dump())
        _widgets[_next_id] = widget
        _next_id += 1
        return widget

    @app.get("/widgets/{widget_id}", response_model=Widget)
    def get_widget(widget_id: int) -> Widget:
        if widget_id not in _widgets:
            raise HTTPException(status_code=404, detail="Widget not found")
        return _widgets[widget_id]

    @app.delete("/widgets/{widget_id}", status_code=204)
    def delete_widget(widget_id: int) -> None:
        if widget_id not in _widgets:
            raise HTTPException(status_code=404, detail="Widget not found")
        del _widgets[widget_id]

    return app
```

### Step 5: Write tests

Create the test directory and files:

```bash
$ mkdir -p tests
```

**`tests/__init__.py`**: (empty file)

**`tests/conftest.py`**:

```python
"""Shared test fixtures."""

import pytest
from fastapi.testclient import TestClient

from widgetapi.app import create_app


@pytest.fixture
def client() -> TestClient:
    """Create a test client with a fresh app instance."""
    app = create_app()
    return TestClient(app)
```

**`tests/test_widgets.py`**:

```python
"""Tests for the widget API endpoints."""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_widget(client: TestClient) -> None:
    response = client.post(
        "/widgets",
        json={"name": "Sprocket", "quantity": 5},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Sprocket"
    assert data["quantity"] == 5
    assert "id" in data


def test_list_widgets(client: TestClient) -> None:
    client.post("/widgets", json={"name": "Gear", "quantity": 10})
    response = client.get("/widgets")
    assert response.status_code == 200
    widgets = response.json()
    assert len(widgets) >= 1


def test_get_widget_not_found(client: TestClient) -> None:
    response = client.get("/widgets/9999")
    assert response.status_code == 404


def test_delete_widget(client: TestClient) -> None:
    # Create
    resp = client.post("/widgets", json={"name": "Bolt", "quantity": 1})
    widget_id = resp.json()["id"]

    # Delete
    resp = client.delete(f"/widgets/{widget_id}")
    assert resp.status_code == 204

    # Confirm gone
    resp = client.get(f"/widgets/{widget_id}")
    assert resp.status_code == 404


def test_create_widget_validation(client: TestClient) -> None:
    # Empty name should fail
    response = client.post("/widgets", json={"name": "", "quantity": 0})
    assert response.status_code == 422

    # Negative quantity should fail
    response = client.post("/widgets", json={"name": "X", "quantity": -1})
    assert response.status_code == 422
```

### Step 6: Run the linter and formatter

```bash
$ uv run ruff check .
All checks passed!

$ uv run ruff format --check .
4 files already formatted.
```

### Step 7: Run the tests

```bash
$ uv run pytest
tests/test_widgets.py ......                                      [100%]
6 passed in 0.42s

$ uv run pytest --cov
tests/test_widgets.py ......                                      [100%]

---------- coverage: platform linux, python 3.13.2 ----------
Name                          Stmts   Miss Branch BrPart  Cover
---------------------------------------------------------------
src/widgetapi/__init__.py         5      2      0      0    60%
src/widgetapi/app.py             28      0      4      0   100%
src/widgetapi/models.py           8      0      0      0   100%
---------------------------------------------------------------
TOTAL                            41      2      4      0    95%
```

### Step 8: Run the server

```bash
$ uv run widgetapi
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
```

### Step 9: Verify in CI

A minimal GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v5

      - name: Set up Python
        run: uv python install 3.13

      - name: Install dependencies
        run: uv sync --frozen

      - name: Lint
        run: uv run ruff check .

      - name: Format check
        run: uv run ruff format --check .

      - name: Type check
        run: uv run mypy src/

      - name: Test
        run: uv run pytest --cov --cov-report=xml
```

### Final directory tree

```
widgetapi/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .python-version
├── README.md
├── pyproject.toml
├── uv.lock                    # committed to git
├── src/
│   └── widgetapi/
│       ├── __init__.py
│       ├── app.py
│       └── models.py
└── tests/
    ├── __init__.py
    ├── conftest.py
    └── test_widgets.py
```

### Commands Cheat Sheet

| Task                          | Command                              |
|-------------------------------|--------------------------------------|
| Create project                | `uv init --package myapp`            |
| Add dependency                | `uv add requests`                    |
| Add dev dependency            | `uv add --dev pytest`                |
| Remove dependency             | `uv remove requests`                 |
| Install from lockfile         | `uv sync`                            |
| Install (production only)     | `uv sync --no-dev`                   |
| Install (CI, strict)          | `uv sync --frozen`                   |
| Run a command in venv         | `uv run pytest`                      |
| Run a script                  | `uv run python script.py`            |
| Install Python                | `uv python install 3.13`             |
| Install global CLI tool       | `uv tool install ruff`               |
| Run tool without installing   | `uvx black .`                        |
| Lint                          | `uv run ruff check .`                |
| Lint and auto-fix             | `uv run ruff check --fix .`          |
| Format                        | `uv run ruff format .`               |
| Check formatting              | `uv run ruff format --check .`       |
| Upgrade lockfile              | `uv lock --upgrade`                  |
| Upgrade one package           | `uv lock --upgrade-package requests` |

---

## 5. mypy — Type Checking

Ruff checks style and catches bugs like unused imports or undefined names, but it does **not** verify that your types are correct. That is mypy's job. mypy reads your type annotations and proves (or disproves) that the types flowing through your code are consistent.

```python
def double(x: int) -> int:
    return x * 2

double("hello")  # Ruff: no complaint. mypy: error.
```

Ruff sees valid syntax. mypy sees that `"hello"` is a `str`, not an `int`, and rejects it.

### 5.1 Installation

```bash
uv add --dev mypy
```

### 5.2 Basic Usage

```bash
# Type-check your source tree
uv run mypy src/

# Type-check a single file
uv run mypy src/myapp/models.py

# Show error codes in output (useful for targeted ignores)
uv run mypy src/ --show-error-codes
```

### 5.3 Reading Error Output

mypy errors follow the pattern `file:line: error: Description [error-code]`. Here are the most common ones you will encounter:

**1. Incompatible return type**

```python
def get_name() -> str:
    return 42
# error: Incompatible return value type (got "int", expected "str")  [return-value]
```

Fix: return the correct type, or fix the annotation.

**2. Incompatible argument type**

```python
def greet(name: str) -> str:
    return f"Hello, {name}"

greet(123)
# error: Argument 1 to "greet" has incompatible type "int"; expected "str"  [arg-type]
```

Fix: pass the correct type.

**3. Optional access without narrowing**

```python
def first_char(s: str | None) -> str:
    return s[0]
# error: Item "None" of "str | None" has no attribute "__getitem__"  [union-attr]
```

Fix: narrow the type first:

```python
def first_char(s: str | None) -> str:
    if s is None:
        return ""
    return s[0]
```

**4. Missing return statement**

```python
def is_positive(n: int) -> bool:
    if n > 0:
        return True
# error: Missing return statement  [return]
```

Fix: handle all code paths:

```python
def is_positive(n: int) -> bool:
    if n > 0:
        return True
    return False
```

**5. Name not defined**

```python
def process() -> None:
    print(result)
# error: Name "result" is not defined  [name-defined]
```

Fix: define the variable before using it.

**6. Incompatible types in assignment**

```python
x: int = 10
x = "hello"
# error: Incompatible types in assignment (expression has type "str", variable has type "int")  [assignment]
```

Fix: use the correct type, or widen the annotation to `int | str` if that is intentional.

### 5.4 Strict Mode and Gradual Adoption

Running `uv run mypy --strict src/` enables every optional check: disallowing untyped definitions, requiring explicit `None` returns, forbidding `Any` types, and more. On an existing codebase this will produce hundreds of errors.

The practical approach is **gradual adoption**:

```bash
# Start with basic checking (the default)
uv run mypy src/

# Add strictness flags one at a time
uv run mypy src/ --disallow-untyped-defs
uv run mypy src/ --disallow-untyped-defs --warn-return-any
uv run mypy src/ --disallow-untyped-defs --warn-return-any --no-implicit-optional
```

Once you pass a flag consistently, add it to `pyproject.toml` so it is enforced everywhere:

```toml
[tool.mypy]
python_version = "3.13"
disallow_untyped_defs = true
warn_return_any = true
no_implicit_optional = true
```

When you are ready, flip the switch to `strict = true` (this is already shown in the `[tool.mypy]` configuration in the [pyproject.toml section](#3-pyprojecttoml--the-single-config-file)).

You can also relax rules for specific modules (e.g., tests do not need full type annotations):

```toml
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### 5.5 `type: ignore` Comments

Sometimes mypy reports an error you cannot or should not fix. You can silence it with a `# type: ignore` comment:

```python
import some_untyped_library  # type: ignore[import-untyped]
```

**When `type: ignore` is appropriate:**

- A third-party library has no type stubs and no `py.typed` marker
- A known mypy false positive (rare, but it happens)
- A deliberate dynamic pattern that mypy cannot understand (e.g., metaclass magic)

**When `type: ignore` is not appropriate:**

- Hiding a real type error because fixing it is inconvenient
- Silencing errors you do not understand -- investigate first
- Blanket `# type: ignore` without an error code (always specify the code: `# type: ignore[arg-type]`)

### 5.6 mypy vs pyright

Both tools read the same PEP 484 / PEP 604 type annotations. The choice depends on your workflow:

| Aspect              | mypy                                    | pyright                                  |
|---------------------|-----------------------------------------|------------------------------------------|
| Language            | Python                                  | TypeScript (Node.js)                     |
| Speed               | Moderate (has daemon mode: `dmypy`)     | Fast                                     |
| VS Code integration | Via extension or CLI                    | Built into Pylance (the default Python extension) |
| Default strictness  | Lenient (opt into strict)               | Stricter by default                      |
| Configuration       | `pyproject.toml` (`[tool.mypy]`)        | `pyproject.toml` (`[tool.pyright]`) or `pyrightconfig.json` |
| Ecosystem           | Most established, widest adoption       | Growing, preferred by many VS Code users |
| Stubs               | Uses `typeshed` + `mypy` stubs packages | Uses `typeshed` + `pyright` bundled stubs |

You can use both: pyright in your editor for instant feedback, mypy in CI for the authoritative check. They agree on the vast majority of cases.

### 5.7 Practical Example

Given this code in `src/widgetapi/utils.py`:

```python
def format_widget_name(name: str, prefix: str | None) -> str:
    return prefix + ": " + name

def get_widget_count(widgets: list[dict]) -> str:
    count = len(widgets)
    if count > 0:
        return count
```

Running mypy:

```bash
$ uv run mypy src/widgetapi/utils.py
src/widgetapi/utils.py:2: error: Unsupported operand types for + ("None" and "str")  [operator]
src/widgetapi/utils.py:5: error: Missing type parameters for generic type "dict"  [type-arg]
src/widgetapi/utils.py:7: error: Incompatible return value type (got "int", expected "str")  [return-value]
src/widgetapi/utils.py:5: error: Missing return statement  [return]
Found 4 errors in 1 file (checked 1 source file)
```

Fix each error:

```python
def format_widget_name(name: str, prefix: str | None) -> str:
    if prefix is None:
        return name
    return prefix + ": " + name

def get_widget_count(widgets: list[dict[str, object]]) -> int:
    return len(widgets)
```

```bash
$ uv run mypy src/widgetapi/utils.py
Success: no issues found in 1 source file
```

---

## 6. pre-commit — Git Hooks

pre-commit is a framework that runs checks automatically before each `git commit`. If any check fails, the commit is blocked until you fix the issue. This catches lint errors, formatting problems, and type errors before they ever reach your remote repository.

### 6.1 Installation

```bash
# Add to dev dependencies
uv add --dev pre-commit

# Install the git hooks into your repo (writes to .git/hooks/pre-commit)
uv run pre-commit install
```

After `pre-commit install`, every `git commit` will trigger your configured hooks.

### 6.2 Configuration: `.pre-commit-config.yaml`

Create `.pre-commit-config.yaml` in your project root:

```yaml
# .pre-commit-config.yaml
repos:
  # ── Ruff: lint and format ──────────────────────────────
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.9.6
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  # ── mypy: type checking ────────────────────────────────
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.14.1
    hooks:
      - id: mypy
        additional_dependencies:
          - fastapi>=0.115
          - pydantic>=2.0
        args: [--strict]

  # ── General file checks ────────────────────────────────
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: [--maxkb=500]
```

The `additional_dependencies` list for the mypy hook is important -- mypy needs your project's dependencies installed to resolve imports and check types against library stubs.

### 6.3 Running Hooks

```bash
# Run all hooks against all files (not just staged files)
uv run pre-commit run --all-files

# Run a specific hook
uv run pre-commit run ruff --all-files
uv run pre-commit run mypy --all-files

# Update hook versions to latest
uv run pre-commit autoupdate
```

Example output when a check fails:

```
$ git commit -m "Add utils module"
ruff.....................................................................Failed
- hook id: ruff
- files were modified by this hook

src/myapp/utils.py:1:8: F401 [*] `os` imported but unused
Fixed 1 error.

ruff-format..............................................................Passed
mypy.....................................................................Passed
trailing-whitespace......................................................Passed
end-of-file-fixer........................................................Passed
```

The commit is blocked. Ruff already fixed the file, so you just need to `git add` the changes and commit again.

### 6.4 Integration with CI

The CI workflow shown in the [Complete Project Setup Walkthrough](#4-complete-project-setup-walkthrough) already runs `ruff check`, `ruff format --check`, and `mypy` as separate steps. pre-commit runs those **same checks** locally before you push. This means:

- **Locally**: pre-commit catches problems at commit time (fast feedback loop)
- **In CI**: the same checks run again as a safety net (catches anything committed with `--no-verify`)

You can also run pre-commit itself in CI:

```yaml
      - name: Run pre-commit
        run: uv run pre-commit run --all-files
```

This is equivalent to running lint + format + type checks individually, but ensures your CI matches exactly what developers run locally.

---

## 7. Docker — Containerizing Python Apps

This is not a Docker course. This is just enough to put your Python app in a container and run it.

### 7.1 A Multi-Stage Dockerfile with uv

Multi-stage builds keep your final image small. Stage 1 installs dependencies, stage 2 copies only what the app needs.

```dockerfile
# ── Stage 1: Install dependencies ────────────────────────
FROM python:3.13-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first (layer caching: dependencies change less often than code)
COPY pyproject.toml uv.lock ./

# Install production dependencies only — no dev tools in the final image
RUN uv sync --frozen --no-dev --no-editable

# ── Stage 2: Runtime image ───────────────────────────────
FROM python:3.13-slim

WORKDIR /app

# Copy the virtual environment from the builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY src/ ./src/

# Put the venv's Python on the PATH
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Run the app
CMD ["uvicorn", "widgetapi.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
```

Why this works well:

- **Layer caching**: `pyproject.toml` and `uv.lock` are copied before source code. If only your code changes, Docker reuses the cached dependency layer.
- **`--frozen`**: fails if `uv.lock` is out of date, same as CI.
- **`--no-dev`**: pytest, ruff, and mypy are not in your production image.
- **`--no-editable`**: installs packages normally instead of as editable (symlink) installs.
- **slim base image**: `python:3.13-slim` is ~150 MB instead of ~1 GB for the full image.

### 7.2 `.dockerignore`

Create `.dockerignore` to keep the build context small and avoid copying secrets:

```
.venv
__pycache__
*.pyc
.git
.github
.env
.env.*
*.pem
.mypy_cache
.pytest_cache
.ruff_cache
dist
*.egg-info
tests
```

### 7.3 Build and Run

```bash
# Build the image
docker build -t widgetapi .

# Run the container
docker run -p 8000:8000 widgetapi

# Run with environment variables
docker run -p 8000:8000 -e DATABASE_URL="postgresql://..." widgetapi

# Run detached (background)
docker run -d -p 8000:8000 --name widgetapi widgetapi

# Check logs
docker logs widgetapi

# Stop and remove
docker stop widgetapi && docker rm widgetapi
```

Test it:

```bash
$ curl http://localhost:8000/health
{"status":"ok"}
```

---

## 8. Packaging & Publishing

Most Python projects are applications that never need publishing. But when you are building a **library** for others to `pip install`, or distributing an internal package, you need to build and publish.

### 8.1 When You Need Packaging

- Publishing an open-source library to PyPI
- Distributing an internal package via a private registry (Artifactory, GitLab, AWS CodeArtifact)
- Sharing a reusable library across multiple projects in your organization

If you are deploying an application (via Docker, systemd, etc.), you typically do **not** need to publish it.

### 8.2 Building with `uv build`

```bash
$ uv build
Building source distribution...
Building wheel...
Successfully built dist/widgetapi-1.2.0.tar.gz
Successfully built dist/widgetapi-1.2.0-py3-none-any.whl
```

This creates two files in `dist/`:

- **`widgetapi-1.2.0.tar.gz`** -- the source distribution (sdist). Contains your source code and metadata.
- **`widgetapi-1.2.0-py3-none-any.whl`** -- the wheel (built distribution). A zip file that pip can install directly without running a build step.

`uv build` uses the build backend declared in your `[build-system]` table (covered in the [pyproject.toml section](#3-pyprojecttoml--the-single-config-file)). If you used `uv init --lib`, this table was generated for you.

### 8.3 Publishing to PyPI

```bash
# Publish to PyPI (prompts for token if not set)
uv publish

# Publish with an explicit token
uv publish --token pypi-AgEIcH...

# Or set the token as an environment variable
export UV_PUBLISH_TOKEN="pypi-AgEIcH..."
uv publish
```

Before publishing:

1. Create an account on [pypi.org](https://pypi.org)
2. Generate an API token at [pypi.org/manage/account/token](https://pypi.org/manage/account/token/)
3. Make sure your `[project]` metadata is complete (name, version, description, license, URLs)

### 8.4 Publishing to a Private Registry

For internal distribution, point `uv publish` at your registry:

```bash
# GitLab Package Registry
uv publish --publish-url https://gitlab.example.com/api/v4/projects/123/packages/pypi

# Artifactory
uv publish --publish-url https://artifactory.example.com/api/pypi/pypi-local/

# AWS CodeArtifact (get token first)
TOKEN=$(aws codeartifact get-authorization-token --domain mycompany --query authorizationToken --output text)
uv publish --publish-url https://mycompany-123456789.d.codeartifact.us-east-1.amazonaws.com/pypi/internal/simple/ --token "$TOKEN"
```

### 8.5 The Full Publish Workflow

```bash
# 1. Make sure tests pass
uv run pytest

# 2. Bump the version in pyproject.toml
#    (manually, or use a tool like bump-my-version)

# 3. Build
uv build

# 4. Inspect what you are about to publish
ls -la dist/
# widgetapi-1.2.0-py3-none-any.whl  widgetapi-1.2.0.tar.gz

# 5. Publish
uv publish

# 6. Tag the release
git tag v1.2.0
git push origin v1.2.0
```

---

## 9. Security Basics

Security is not a separate phase -- it is baked into your daily workflow. These are the minimum practices every project should follow.

### 9.1 Dependency Auditing

```bash
# Scan your dependencies for known vulnerabilities (CVEs)
uv audit
```

Example output:

```
$ uv audit
Found 2 vulnerabilities
  pydantic 1.10.2 — GHSA-5jqp-qgf6-3pvh (high severity)
    Denial of service via recursive model parsing
    Fix: upgrade to >=1.10.4

  cryptography 41.0.0 — CVE-2023-49083 (critical severity)
    NULL pointer dereference in PKCS12 parsing
    Fix: upgrade to >=41.0.6
```

Fix by upgrading:

```bash
uv lock --upgrade-package pydantic
uv lock --upgrade-package cryptography
uv sync
```

Run `uv audit` in CI to catch vulnerable dependencies before they reach production.

### 9.2 Secrets Management

**Never commit secrets.** This means API keys, database passwords, cloud credentials, and private keys must stay out of version control.

**Use environment variables for secrets:**

```python
import os

database_url = os.environ["DATABASE_URL"]       # crashes if missing (good — fail loud)
api_key = os.environ.get("API_KEY", "")          # empty string default (only if optional)
```

**Use `.env` files for local development only:**

```bash
# .env — NEVER committed to git
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
API_KEY=sk-abc123
SECRET_KEY=supersecretvalue
```

`pydantic-settings` (covered in Phase 4) provides a clean way to load settings from environment variables and `.env` files with full type validation:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    api_key: str
    debug: bool = False

    model_config = {"env_file": ".env"}
```

**For production**, use a dedicated secret store instead of `.env` files:

- AWS Secrets Manager
- HashiCorp Vault
- Google Secret Manager
- Azure Key Vault
- Kubernetes Secrets (mounted as env vars or files)

### 9.3 Security Linting with Ruff

The Ruff configuration shown in the [Ruff section](#2-ruff--linting-and-formatting) already includes the `"S"` rule prefix (flake8-bandit). This catches common security issues:

```bash
$ uv run ruff check --select S src/
src/myapp/auth.py:12:5: S105 Possible hardcoded password assigned to variable
src/myapp/utils.py:8:5: S603 `subprocess` call: check for execution of untrusted input
src/myapp/db.py:4:1: S608 Possible SQL injection via string-based query construction
```

Key security rules to know:

| Rule   | What It Catches                              |
|--------|----------------------------------------------|
| `S101` | Use of `assert` (stripped in optimized mode)  |
| `S105` | Hardcoded passwords in code                  |
| `S106` | Hardcoded passwords in function arguments    |
| `S108` | Insecure temp file usage                     |
| `S301` | Use of `pickle` (deserialization risk)       |
| `S603` | Subprocess calls with untrusted input        |
| `S608` | SQL injection via string formatting          |

### 9.4 `.gitignore` Essentials

Your `.gitignore` should include at minimum:

```gitignore
# Secrets and credentials
.env
.env.*
*.pem
*.key
credentials.*
secrets.*

# Python
__pycache__/
*.pyc
.venv/
dist/
*.egg-info/

# Tool caches
.mypy_cache/
.pytest_cache/
.ruff_cache/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

If you accidentally commit a secret, rotating the credential is **not optional** -- it must be treated as compromised. Removing it from a later commit does not help because git history preserves it. Use `git filter-repo` or the GitHub secret scanning alerts to detect and clean up, but always rotate first.

---

**You now have a complete, modern Python development environment.** The tools covered in this phase -- `uv`, `ruff`, `pyproject.toml`, `mypy`, `pre-commit`, `docker`, `uv build`, and `uv audit` -- handle everything from Python installation to dependency locking to code formatting to type safety to containerized deployment. No `requirements.txt`, no `setup.py`, no `tox.ini`, no `.flake8`, no `black.toml`. One config file, a handful of fast CLI tools, zero friction.
