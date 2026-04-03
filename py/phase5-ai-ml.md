# Phase 5: AI/ML Domain

---

## 5a. Foundations

---

### 1. NumPy 2.0

#### Breaking Changes from 1.x

```python
# --- dtype changes in NumPy 2.0 ---
import numpy as np

# In NumPy 1.x, the default integer on Windows was int32.
# In NumPy 2.0, it is now int64 on all 64-bit platforms.
arr = np.array([1, 2, 3])
print(arr.dtype)  # int64 (consistent across platforms now)

# Removed aliases — these WILL raise errors in 2.0:
# np.float       -> use np.float64 or built-in float
# np.int         -> use np.int_ or np.int64 or built-in int
# np.complex     -> use np.complex128
# np.object      -> use np.object_
# np.bool        -> use np.bool_
# np.str         -> use np.str_

# Migration: find deprecated usage
# Run: python -W error -c "import numpy as np; np.float"
# Or use ruff/grep to find all np.float, np.int, etc. in your codebase.

# String dtype changes
# NumPy 2.0 introduces np.dtypes.StringDType — a variable-length string dtype.
# Old fixed-width Unicode: dtype='U10' (still works but not the default path forward)
from numpy.dtypes import StringDType

arr = np.array(["hello", "world"], dtype=StringDType())
print(arr.dtype)  # StringDType()
print(arr[0])     # hello

# Copy keyword change:
# np.array(x, copy=False) now means "never copy" (raises if a copy is required).
# In 1.x, copy=False meant "copy only if needed."
# Use copy=None for the old copy=False behavior.
a = np.array([1, 2, 3])
b = np.array(a, copy=None)  # copies only if needed (old copy=False behavior)
```

#### Core Operations Refresher

```python
import numpy as np

# --- Array creation ---
a = np.array([1, 2, 3, 4])
b = np.zeros((3, 4))
c = np.ones((2, 3), dtype=np.float32)
d = np.arange(0, 10, 2)          # [0, 2, 4, 6, 8]
e = np.linspace(0, 1, 5)         # [0. , 0.25, 0.5 , 0.75, 1. ]
f = np.random.default_rng(42).standard_normal((3, 3))

# --- Indexing and slicing ---
m = np.arange(12).reshape(3, 4)
print(m)
# [[ 0  1  2  3]
#  [ 4  5  6  7]
#  [ 8  9 10 11]]

print(m[1, 2])        # 6
print(m[:, 1])         # [1 5 9]          — full column
print(m[0:2, 1:3])     # [[1 2] [5 6]]    — submatrix

# Boolean indexing
print(m[m > 5])        # [ 6  7  8  9 10 11]

# Fancy indexing
rows = np.array([0, 2])
cols = np.array([1, 3])
print(m[rows, cols])   # [1 11]

# --- Broadcasting ---
# Rule: dimensions are compared from the trailing side;
# two dimensions are compatible when they are equal or one of them is 1.
x = np.ones((3, 4))
y = np.array([1, 2, 3, 4])   # shape (4,)
print((x + y).shape)          # (3, 4) — y is broadcast across rows

col = np.array([[10], [20], [30]])  # shape (3, 1)
print((x + col).shape)              # (3, 4) — col is broadcast across columns

# --- Universal functions (ufuncs) ---
a = np.array([0, np.pi / 4, np.pi / 2])
print(np.sin(a))       # [0.   0.707 1.   ]
print(np.exp(a))       # [1.    2.19  4.81 ]

# Aggregations
data = np.random.default_rng(0).standard_normal((4, 5))
print(data.mean(axis=0))   # column means — shape (5,)
print(data.sum(axis=1))    # row sums — shape (4,)
print(data.std())           # overall standard deviation

# --- Structured arrays ---
dt = np.dtype([("name", "U10"), ("age", "i4"), ("score", "f8")])
records = np.array([("Alice", 30, 95.5), ("Bob", 25, 87.0)], dtype=dt)
print(records["name"])   # ['Alice' 'Bob']
print(records[records["score"] > 90])
```

#### New Features in 2.0

```python
import numpy as np

# 1. Variable-length string dtype (mentioned above)
from numpy.dtypes import StringDType

names = np.array(["short", "a much longer string"], dtype=StringDType())

# 2. Improved type promotion rules
# NumPy 2.0 uses NEP 50 — value-based promotion is removed.
# Python scalars no longer cause unexpected upcasting.
a = np.array([1, 2, 3], dtype=np.int8)
result = a + 1          # stays int8 in 2.0 (was int64 in 1.x due to Python int)
print(result.dtype)     # int8

# 3. np.unique gains equal_nan parameter
arr = np.array([1.0, np.nan, np.nan, 2.0])
print(np.unique(arr, equal_nan=True))   # [1. 2. nan]  — one nan
print(np.unique(arr, equal_nan=False))  # [1. 2. nan nan]

# 4. Performance improvements
# Many operations are faster due to SIMD improvements.
# np.sort, np.argsort use a new radix sort for integer types — up to 10x faster.
big = np.random.default_rng(0).integers(0, 1_000_000, size=1_000_000)
sorted_arr = np.sort(big)  # Significantly faster for integer dtypes
```

---

### 2. scikit-learn

#### Pipeline API, Preprocessing, Model Selection

```python
import numpy as np
from sklearn.datasets import load_iris, fetch_california_housing
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, mean_squared_error

# =====================
# Classification example
# =====================
X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Build a pipeline: scale -> classify
clf_pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", LogisticRegression(max_iter=200, random_state=42)),
])

clf_pipe.fit(X_train, y_train)
y_pred = clf_pipe.predict(X_test)
print(classification_report(y_test, y_pred))

# =====================
# Regression example
# =====================
X, y = fetch_california_housing(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

reg_pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("poly", PolynomialFeatures(degree=2, include_bias=False)),
    ("reg", Ridge(alpha=1.0)),
])

reg_pipe.fit(X_train, y_train)
y_pred = reg_pipe.predict(X_test)
rmse = mean_squared_error(y_test, y_pred, squared=False)
print(f"RMSE: {rmse:.4f}")
```

#### Cross-Validation and Grid Search

```python
from sklearn.model_selection import cross_val_score, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris

X, y = load_iris(return_X_y=True)

pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("clf", RandomForestClassifier(random_state=42)),
])

# Cross-validation
scores = cross_val_score(pipe, X, y, cv=5, scoring="accuracy")
print(f"CV accuracy: {scores.mean():.3f} +/- {scores.std():.3f}")

# Grid search over pipeline parameters
# Use "step_name__param" syntax to address params inside the pipeline.
param_grid = {
    "clf__n_estimators": [50, 100, 200],
    "clf__max_depth": [3, 5, None],
}

gs = GridSearchCV(pipe, param_grid, cv=5, scoring="accuracy", n_jobs=-1)
gs.fit(X, y)

print(f"Best params: {gs.best_params_}")
print(f"Best CV accuracy: {gs.best_score_:.3f}")

# Use the best estimator directly
best_model = gs.best_estimator_
```

---

### 3. PyTorch

#### Tensor Basics and Autograd

```python
import torch

# --- Tensor creation ---
a = torch.tensor([1.0, 2.0, 3.0])
b = torch.zeros(3, 4)
c = torch.randn(2, 3)                         # standard normal
d = torch.arange(0, 10, 2, dtype=torch.float32)

# Device placement
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
x = torch.randn(3, 3, device=device)

# From/to NumPy
import numpy as np
np_arr = np.array([1.0, 2.0, 3.0])
t = torch.from_numpy(np_arr)         # shares memory (CPU only)
back = t.numpy()                      # back to numpy

# --- Autograd ---
x = torch.tensor(3.0, requires_grad=True)
y = x ** 2 + 2 * x + 1    # y = x^2 + 2x + 1
y.backward()
print(x.grad)   # dy/dx = 2x + 2 = 8.0

# Gradient with multi-dimensional tensors
W = torch.randn(3, 4, requires_grad=True)
x = torch.randn(4, 1)
loss = (W @ x).sum()
loss.backward()
print(W.grad.shape)  # (3, 4)
```

#### nn.Module and Training Loop

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# --- Define a model ---
class SimpleNet(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

# --- Synthetic data ---
torch.manual_seed(42)
X = torch.randn(1000, 10)
# Binary classification target
y = (X[:, 0] + X[:, 1] > 0).long()

dataset = TensorDataset(X, y)
train_loader = DataLoader(dataset, batch_size=64, shuffle=True)

# --- Training loop ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = SimpleNet(input_dim=10, hidden_dim=32, output_dim=2).to(device)
optimizer = optim.Adam(model.parameters(), lr=1e-3)
criterion = nn.CrossEntropyLoss()

for epoch in range(20):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_X, batch_y in train_loader:
        batch_X, batch_y = batch_X.to(device), batch_y.to(device)

        optimizer.zero_grad()
        logits = model(batch_X)
        loss = criterion(logits, batch_y)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * batch_X.size(0)
        correct += (logits.argmax(dim=1) == batch_y).sum().item()
        total += batch_X.size(0)

    if (epoch + 1) % 5 == 0:
        avg_loss = total_loss / total
        acc = correct / total
        print(f"Epoch {epoch+1:>2d} | Loss: {avg_loss:.4f} | Acc: {acc:.3f}")

# --- Inference ---
model.eval()
with torch.no_grad():
    sample = torch.randn(1, 10, device=device)
    pred = model(sample).argmax(dim=1)
    print(f"Prediction: {pred.item()}")
```

#### torch.compile() for Speedups

```python
import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(784, 256),
    nn.ReLU(),
    nn.Linear(256, 10),
)

# torch.compile() — introduced in PyTorch 2.0 — traces and compiles the model
# via TorchDynamo + TorchInductor, fusing operations and generating optimized
# kernels. No code changes needed beyond this one call.
compiled_model = torch.compile(model)

# Use compiled_model exactly like model:
x = torch.randn(32, 784)
out = compiled_model(x)  # First call is slow (compilation), subsequent calls are fast.

# Modes:
#   "default"      — balanced compile time and speedup
#   "reduce-overhead" — minimizes CPU overhead (good for small batches)
#   "max-autotune"   — tries many kernels, longest compile, best runtime
compiled_fast = torch.compile(model, mode="reduce-overhead")
```

#### Custom Dataset and DataLoader

```python
import torch
from torch.utils.data import Dataset, DataLoader

class CSVDataset(Dataset):
    """Example custom dataset that wraps in-memory data."""

    def __init__(self, features, labels):
        self.features = torch.tensor(features, dtype=torch.float32)
        self.labels = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]

# Usage
import numpy as np
rng = np.random.default_rng(42)
X = rng.standard_normal((500, 8))
y = (X[:, 0] > 0).astype(int)

dataset = CSVDataset(X, y)
loader = DataLoader(dataset, batch_size=32, shuffle=True, num_workers=0)

for batch_features, batch_labels in loader:
    print(batch_features.shape, batch_labels.shape)
    break  # (32, 8) (32,)
```

---

### 4. Keras 3

#### Multi-Backend Support

```python
# Keras 3 can run on TensorFlow, PyTorch, or JAX.
# Set the backend BEFORE importing keras:
import os
os.environ["KERAS_BACKEND"] = "torch"  # or "tensorflow" or "jax"

import keras
from keras import layers, ops
import numpy as np

print(f"Keras version: {keras.__version__}")
print(f"Backend: {keras.backend.backend()}")

# --- Build a model ---
model = keras.Sequential([
    layers.Input(shape=(784,)),
    layers.Dense(128, activation="relu"),
    layers.Dropout(0.3),
    layers.Dense(64, activation="relu"),
    layers.Dense(10, activation="softmax"),
])

model.summary()

# --- Compile and train ---
model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

# Synthetic data
rng = np.random.default_rng(42)
X_train = rng.standard_normal((1000, 784)).astype(np.float32)
y_train = rng.integers(0, 10, size=1000)
X_val = rng.standard_normal((200, 784)).astype(np.float32)
y_val = rng.integers(0, 10, size=200)

history = model.fit(
    X_train, y_train,
    epochs=5,
    batch_size=64,
    validation_data=(X_val, y_val),
)

# --- Evaluate ---
loss, acc = model.evaluate(X_val, y_val)
print(f"Val loss: {loss:.4f}, Val acc: {acc:.4f}")

# --- Predict ---
predictions = model.predict(X_val[:5])
print("Predicted classes:", predictions.argmax(axis=1))
```

#### Functional API (for complex architectures)

```python
import os
os.environ["KERAS_BACKEND"] = "torch"

import keras
from keras import layers

# Two-input model
text_input = keras.Input(shape=(100,), name="text_features")
meta_input = keras.Input(shape=(5,), name="metadata")

x = layers.Dense(64, activation="relu")(text_input)
x = layers.Dropout(0.3)(x)

combined = layers.Concatenate()([x, meta_input])
combined = layers.Dense(32, activation="relu")(combined)
output = layers.Dense(1, activation="sigmoid")(combined)

model = keras.Model(inputs=[text_input, meta_input], outputs=output)
model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
model.summary()
```

#### When to Use Keras vs Raw PyTorch

```text
Use Keras when:
  - You want a fast prototyping loop with minimal boilerplate.
  - You want to switch backends (TF/PyTorch/JAX) without rewriting.
  - You are building standard architectures (CNNs, RNNs, Transformers).
  - You value built-in callbacks (EarlyStopping, ModelCheckpoint, etc.).

Use raw PyTorch when:
  - You need full control over the training loop (custom loss schedules,
    gradient accumulation, mixed precision details).
  - You are doing research with non-standard forward passes.
  - You are integrating with the PyTorch ecosystem (HuggingFace, torchvision,
    torchaudio) that expects nn.Module.
  - You need torch.compile(), DDP, or FSDP for distributed training.
```

---

## 5b. LLMs & GenAI

---

### 5. Anthropic SDK

#### Client Setup and Messages API

```python
# pip install anthropic
import anthropic

# Client reads ANTHROPIC_API_KEY from environment by default
client = anthropic.Anthropic()

# Simple message
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain backpropagation in 3 sentences."},
    ],
)
print(response.content[0].text)
print(f"Tokens used: {response.usage.input_tokens} in, {response.usage.output_tokens} out")

# System prompt
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=256,
    system="You are a Python expert. Reply with code only, no explanation.",
    messages=[
        {"role": "user", "content": "Write a function to flatten a nested list."},
    ],
)
print(response.content[0].text)
```

#### Streaming

```python
import anthropic

client = anthropic.Anthropic()

# Streaming with context manager
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=512,
    messages=[{"role": "user", "content": "Write a haiku about machine learning."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
print()  # newline at end
```

#### Tool Use — Complete Example

```python
import anthropic
import json

client = anthropic.Anthropic()

# Define tools
tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a given city.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "City name, e.g. 'San Francisco'",
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature unit",
                },
            },
            "required": ["city"],
        },
    },
    {
        "name": "calculate",
        "description": "Evaluate a mathematical expression.",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Math expression, e.g. '2 + 2 * 3'",
                },
            },
            "required": ["expression"],
        },
    },
]


def handle_tool_call(tool_name: str, tool_input: dict) -> str:
    """Simulate tool execution."""
    if tool_name == "get_weather":
        city = tool_input["city"]
        unit = tool_input.get("unit", "celsius")
        # In production, call a real weather API here
        return json.dumps({"city": city, "temperature": 22, "unit": unit, "condition": "sunny"})
    elif tool_name == "calculate":
        expr = tool_input["expression"]
        result = eval(expr)  # use a safe parser in production
        return json.dumps({"expression": expr, "result": result})
    return json.dumps({"error": "Unknown tool"})


def chat_with_tools(user_message: str) -> str:
    """Run a full tool-use loop: send message, handle tool calls, return final answer."""
    messages = [{"role": "user", "content": user_message}]

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )

        # If the model wants to use tools, execute them and continue
        if response.stop_reason == "tool_use":
            # Append the assistant's response (may contain text + tool_use blocks)
            messages.append({"role": "assistant", "content": response.content})

            # Process each tool call
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = handle_tool_call(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

            messages.append({"role": "user", "content": tool_results})
        else:
            # Model is done — extract final text
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text
            return final_text


# Run it
answer = chat_with_tools("What's the weather in Tokyo and what's 42 * 17?")
print(answer)
```

---

### 6. OpenAI SDK

#### Client Setup and Chat Completions

```python
# pip install openai
from openai import OpenAI

# Reads OPENAI_API_KEY from environment
client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain gradient descent in 3 sentences."},
    ],
    max_tokens=256,
)

print(response.choices[0].message.content)
print(f"Tokens: {response.usage.prompt_tokens} in, {response.usage.completion_tokens} out")

# Streaming
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a haiku about Python."}],
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta
    if delta.content:
        print(delta.content, end="", flush=True)
print()
```

#### Function Calling

```python
from openai import OpenAI
import json

client = OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                },
                "required": ["city"],
            },
        },
    }
]

messages = [{"role": "user", "content": "What's the weather in Paris?"}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
)

# Check if the model wants to call a tool
choice = response.choices[0]
if choice.finish_reason == "tool_calls":
    for tool_call in choice.message.tool_calls:
        args = json.loads(tool_call.function.arguments)
        # Execute the tool (simulated)
        result = json.dumps({"city": args["city"], "temp": 18, "condition": "cloudy"})

        # Send tool result back
        messages.append(choice.message)  # assistant message with tool_calls
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": result,
        })

    # Get final response
    final = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
    )
    print(final.choices[0].message.content)
```

#### Anthropic vs OpenAI SDK Comparison

```text
Feature              | Anthropic SDK               | OpenAI SDK
---------------------|-----------------------------|----------------------------
Client               | anthropic.Anthropic()       | openai.OpenAI()
Send message         | client.messages.create()    | client.chat.completions.create()
Response text        | response.content[0].text    | response.choices[0].message.content
Streaming            | client.messages.stream()    | stream=True parameter
Stop reason          | response.stop_reason        | choice.finish_reason
Tool definition      | tools=[{name, input_schema}]| tools=[{type, function}]
Tool call detection  | stop_reason == "tool_use"   | finish_reason == "tool_calls"
Tool result format   | role="user" + tool_result   | role="tool" + tool_call_id
System prompt        | system= parameter           | role="system" message
```

---

### 7. Hugging Face

#### Loading Models and Tokenizers

```python
# pip install transformers torch datasets
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

model_name = "distilbert-base-uncased-finetuned-sst-2-english"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

# Tokenize
text = "This movie was absolutely fantastic!"
inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
print(inputs.keys())  # dict_keys(['input_ids', 'attention_mask'])

# Inference
model.eval()
with torch.no_grad():
    outputs = model(**inputs)
    logits = outputs.logits
    predicted_class = logits.argmax(dim=1).item()
    labels = model.config.id2label
    print(f"Prediction: {labels[predicted_class]}")  # POSITIVE
```

#### Inference Pipeline (High-Level API)

```python
from transformers import pipeline

# Sentiment analysis
classifier = pipeline("sentiment-analysis")
results = classifier([
    "I love this product!",
    "This is terrible and broken.",
])
for r in results:
    print(f"{r['label']}: {r['score']:.4f}")

# Text generation
generator = pipeline("text-generation", model="gpt2")
output = generator("Machine learning is", max_new_tokens=50, do_sample=True)
print(output[0]["generated_text"])

# Summarization
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
long_text = """
Artificial intelligence has transformed numerous industries over the past decade.
From healthcare diagnostics to autonomous vehicles, AI systems are now capable of
performing tasks that once required human expertise. The rapid advancement of large
language models has further accelerated this transformation, enabling natural language
understanding and generation at unprecedented levels of quality.
"""
summary = summarizer(long_text, max_length=50, min_length=20)
print(summary[0]["summary_text"])

# Zero-shot classification
zs = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
result = zs(
    "The stock market crashed today after the Fed raised interest rates.",
    candidate_labels=["politics", "finance", "sports", "technology"],
)
print(f"Top label: {result['labels'][0]} ({result['scores'][0]:.3f})")
```

#### Fine-Tuning Basics

```python
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)
from datasets import load_dataset
import numpy as np

# Load dataset
dataset = load_dataset("imdb", split={"train": "train[:2000]", "test": "test[:500]"})

# Tokenize
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")

def tokenize_fn(examples):
    return tokenizer(examples["text"], truncation=True, padding="max_length", max_length=256)

tokenized = dataset.map(tokenize_fn, batched=True, remove_columns=["text"])
tokenized = tokenized.rename_column("label", "labels")
tokenized.set_format("torch")

# Load model
model = AutoModelForSequenceClassification.from_pretrained(
    "distilbert-base-uncased", num_labels=2
)

# Training arguments
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=2,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    weight_decay=0.01,
    logging_steps=50,
    load_best_model_at_end=True,
)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=1)
    accuracy = (preds == labels).mean()
    return {"accuracy": accuracy}

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["test"],
    compute_metrics=compute_metrics,
)

trainer.train()
results = trainer.evaluate()
print(f"Eval accuracy: {results['eval_accuracy']:.4f}")
```

#### datasets Library

```python
from datasets import load_dataset, Dataset, DatasetDict

# Load from the Hub
ds = load_dataset("squad", split="train[:100]")
print(ds)
print(ds[0])

# Load a CSV
# ds = load_dataset("csv", data_files="my_data.csv")

# Create from dict
data = {
    "text": ["hello world", "foo bar", "machine learning"],
    "label": [0, 1, 1],
}
ds = Dataset.from_dict(data)
print(ds)

# Common operations
ds = ds.map(lambda x: {"text_len": len(x["text"])})  # add column
ds = ds.filter(lambda x: x["text_len"] > 5)           # filter
ds = ds.shuffle(seed=42)
ds = ds.train_test_split(test_size=0.2)                # returns DatasetDict
print(ds)
```

---

### 8. LangChain

#### Chains, Prompts, Output Parsers

```python
# pip install langchain langchain-anthropic langchain-community
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser

# Initialize LLM
llm = ChatAnthropic(model="claude-sonnet-4-20250514")

# Simple chain with LCEL (LangChain Expression Language)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that explains {topic} concepts."),
    ("user", "{question}"),
])

chain = prompt | llm | StrOutputParser()

result = chain.invoke({
    "topic": "machine learning",
    "question": "What is overfitting?",
})
print(result)

# JSON output parser
from pydantic import BaseModel, Field

class MovieReview(BaseModel):
    title: str = Field(description="Movie title")
    rating: int = Field(description="Rating from 1 to 10")
    summary: str = Field(description="One-sentence summary")

json_parser = JsonOutputParser(pydantic_object=MovieReview)

review_prompt = ChatPromptTemplate.from_messages([
    ("system", "Analyze the movie review and extract structured data.\n{format_instructions}"),
    ("user", "{review}"),
])

review_chain = review_prompt | llm | json_parser
result = review_chain.invoke({
    "review": "Inception was mind-blowing! The visual effects and storyline were top-notch.",
    "format_instructions": json_parser.get_format_instructions(),
})
print(result)  # {'title': 'Inception', 'rating': 9, 'summary': '...'}
```

#### RAG Chain Example

```python
# pip install langchain langchain-anthropic langchain-community chromadb
from langchain_anthropic import ChatAnthropic
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain.text_splitter import RecursiveCharacterTextSplitter

# 1. Prepare documents
documents = [
    "Python 3.12 introduced type parameter syntax with the 'type' keyword.",
    "The GIL in Python can be disabled in 3.13 with the --disable-gil flag.",
    "Pattern matching was introduced in Python 3.10 with match/case statements.",
    "Python 3.11 brought significant performance improvements of 10-60% speedup.",
    "Dataclasses were introduced in Python 3.7 as a decorator for data-holding classes.",
]

# 2. Split and embed
splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=20)
texts = splitter.create_documents(documents)

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma.from_documents(texts, embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# 3. Build RAG chain
template = """Answer the question based only on the following context:

Context: {context}

Question: {question}

If the context doesn't contain the answer, say "I don't have that information."
"""

prompt = ChatPromptTemplate.from_template(template)
llm = ChatAnthropic(model="claude-sonnet-4-20250514")

def format_docs(docs):
    return "\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

answer = rag_chain.invoke("When was pattern matching added to Python?")
print(answer)
```

#### Agent Example

```python
from langchain_anthropic import ChatAnthropic
from langchain.agents import tool, AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate

llm = ChatAnthropic(model="claude-sonnet-4-20250514")

@tool
def search_docs(query: str) -> str:
    """Search internal documentation for information."""
    # Simulated search
    docs = {
        "vacation": "Employees get 20 days of PTO per year.",
        "remote": "Remote work is allowed 3 days per week.",
        "salary": "Salary reviews happen annually in March.",
    }
    for key, val in docs.items():
        if key in query.lower():
            return val
    return "No relevant documentation found."

@tool
def calculator(expression: str) -> str:
    """Calculate a mathematical expression."""
    return str(eval(expression))  # use a safe parser in production

tools = [search_docs, calculator]

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an HR assistant. Use tools to answer questions."),
    ("user", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

result = executor.invoke({"input": "How many vacation days do employees get?"})
print(result["output"])
```

---

### 9. LlamaIndex

#### Document Loading, Indexing, Querying

```python
# pip install llama-index llama-index-llms-anthropic llama-index-embeddings-huggingface
from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    Document,
    Settings,
)
from llama_index.llms.anthropic import Anthropic
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

# Configure global settings
Settings.llm = Anthropic(model="claude-sonnet-4-20250514")
Settings.embed_model = HuggingFaceEmbedding(model_name="all-MiniLM-L6-v2")
Settings.chunk_size = 256
Settings.chunk_overlap = 20

# Create documents manually (or use SimpleDirectoryReader for files)
documents = [
    Document(text="NumPy 2.0 removed deprecated aliases like np.float and np.int. "
                  "Use np.float64 and np.int64 instead."),
    Document(text="PyTorch 2.0 introduced torch.compile() which uses TorchDynamo "
                  "to trace Python bytecode and generate optimized kernels."),
    Document(text="Keras 3 supports multiple backends: TensorFlow, PyTorch, and JAX. "
                  "Set the backend via the KERAS_BACKEND environment variable."),
    Document(text="scikit-learn's Pipeline API chains preprocessing and model steps "
                  "into a single estimator. Use GridSearchCV for hyperparameter tuning."),
]

# From a directory:
# documents = SimpleDirectoryReader("./data").load_data()

# Build index
index = VectorStoreIndex.from_documents(documents)

# Query
query_engine = index.as_query_engine(similarity_top_k=2)
response = query_engine.query("What changed in NumPy 2.0?")
print(response)
print(f"\nSources: {[n.node.text[:80] for n in response.source_nodes]}")
```

#### Simple RAG Example

```python
from llama_index.core import VectorStoreIndex, Document, Settings
from llama_index.llms.anthropic import Anthropic
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

Settings.llm = Anthropic(model="claude-sonnet-4-20250514")
Settings.embed_model = HuggingFaceEmbedding(model_name="all-MiniLM-L6-v2")

# Simulate loading documents from various sources
docs = [
    Document(text=t, metadata={"source": s})
    for t, s in [
        ("Our Q4 revenue was $5.2M, up 23% YoY.", "financials.pdf"),
        ("The engineering team grew from 15 to 28 people.", "hr_report.pdf"),
        ("We launched 3 new products in Q4.", "product_update.pdf"),
        ("Customer churn decreased to 2.1% from 3.4%.", "metrics.pdf"),
    ]
]

index = VectorStoreIndex.from_documents(docs)

# Chat engine retains conversation context
chat_engine = index.as_chat_engine(chat_mode="condense_plus_context")

response1 = chat_engine.chat("What was our Q4 revenue?")
print(f"A1: {response1}")

response2 = chat_engine.chat("How does that compare to the team growth?")
print(f"A2: {response2}")
```

---

### 10. Agents — CrewAI and LangGraph

#### CrewAI: Simple Multi-Agent Example

```python
# pip install crewai crewai-tools
from crewai import Agent, Task, Crew, Process

# Define agents
researcher = Agent(
    role="Research Analyst",
    goal="Find comprehensive information about the given topic",
    backstory="You are an experienced research analyst skilled at gathering "
              "and synthesizing information from various sources.",
    verbose=True,
    allow_delegation=False,
)

writer = Agent(
    role="Technical Writer",
    goal="Create clear, concise summaries from research findings",
    backstory="You are a skilled technical writer who transforms complex "
              "research into accessible content.",
    verbose=True,
    allow_delegation=False,
)

# Define tasks
research_task = Task(
    description="Research the current state of {topic}. "
                "Focus on key trends, challenges, and opportunities.",
    expected_output="A detailed research brief with key findings.",
    agent=researcher,
)

writing_task = Task(
    description="Using the research findings, write a concise executive summary "
                "about {topic}. Include key statistics and actionable insights.",
    expected_output="A polished executive summary (300-500 words).",
    agent=writer,
)

# Create crew
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential,  # tasks run in order
    verbose=True,
)

# Run
result = crew.kickoff(inputs={"topic": "AI agents in production systems"})
print(result)
```

#### LangGraph: Stateful Workflow

```python
# pip install langgraph langchain-anthropic
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

# 1. Define state
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    next_step: str

# 2. Define nodes
llm = ChatAnthropic(model="claude-sonnet-4-20250514")

def classify(state: AgentState) -> AgentState:
    """Classify the user query into a category."""
    messages = [
        SystemMessage(content=(
            "Classify the user query into exactly one category: "
            "'technical', 'billing', or 'general'. "
            "Reply with just the category name."
        )),
        *state["messages"],
    ]
    response = llm.invoke(messages)
    category = response.content.strip().lower()
    return {"messages": [response], "next_step": category}

def handle_technical(state: AgentState) -> AgentState:
    """Handle technical queries."""
    messages = [
        SystemMessage(content="You are a technical support expert. Be precise and helpful."),
        state["messages"][0],  # original user message
    ]
    response = llm.invoke(messages)
    return {"messages": [response], "next_step": "done"}

def handle_billing(state: AgentState) -> AgentState:
    """Handle billing queries."""
    messages = [
        SystemMessage(content="You are a billing support specialist. Be clear about pricing."),
        state["messages"][0],
    ]
    response = llm.invoke(messages)
    return {"messages": [response], "next_step": "done"}

def handle_general(state: AgentState) -> AgentState:
    """Handle general queries."""
    messages = [
        SystemMessage(content="You are a friendly general support assistant."),
        state["messages"][0],
    ]
    response = llm.invoke(messages)
    return {"messages": [response], "next_step": "done"}

# 3. Define routing logic
def route_query(state: AgentState) -> str:
    next_step = state.get("next_step", "general")
    if next_step == "technical":
        return "handle_technical"
    elif next_step == "billing":
        return "handle_billing"
    else:
        return "handle_general"

# 4. Build graph
graph = StateGraph(AgentState)

graph.add_node("classify", classify)
graph.add_node("handle_technical", handle_technical)
graph.add_node("handle_billing", handle_billing)
graph.add_node("handle_general", handle_general)

graph.set_entry_point("classify")
graph.add_conditional_edges("classify", route_query)
graph.add_edge("handle_technical", END)
graph.add_edge("handle_billing", END)
graph.add_edge("handle_general", END)

app = graph.compile()

# 5. Run
result = app.invoke({
    "messages": [HumanMessage(content="My API calls are returning 429 errors")],
    "next_step": "",
})

for msg in result["messages"]:
    print(f"{msg.type}: {msg.content[:200]}")
```

---

### 11. Prompt Engineering Patterns

#### System Prompts — Persona, Constraints, Output Format

```python
import anthropic

client = anthropic.Anthropic()

# A well-structured system prompt sets the model's behavior up front.
# Three components: persona (who you are), constraints (rules), output format.
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=(
        "You are a senior Python code reviewer. "
        "Rules:\n"
        "- Only comment on bugs, security issues, and performance problems.\n"
        "- Ignore style/formatting — assume the team has a linter.\n"
        "- Be direct. No filler phrases.\n"
        "- Format each issue as: [SEVERITY] file:line — description."
    ),
    messages=[
        {
            "role": "user",
            "content": (
                "Review this code:\n\n"
                "```python\n"
                "import pickle\n"
                "def load_user(data: bytes):\n"
                "    return pickle.loads(data)\n\n"
                "def get_discount(price, discount):\n"
                "    return price - price * discount / 100\n"
                "```"
            ),
        },
    ],
)
print(response.content[0].text)
# [CRITICAL] file:3 — pickle.loads on untrusted data allows arbitrary code execution.
#   Use json.loads or a safe deserialization format.
```

#### Few-Shot Examples — In-Context Learning

```python
import anthropic

client = anthropic.Anthropic()

# Few-shot: provide input/output pairs so the model learns the pattern.
# Structure them as alternating user/assistant messages.
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=256,
    system="Extract the city and country from the given text. Reply with just 'city, country'.",
    messages=[
        # Example 1
        {"role": "user", "content": "I visited the Eiffel Tower last summer."},
        {"role": "assistant", "content": "Paris, France"},
        # Example 2
        {"role": "user", "content": "The cherry blossoms in the Imperial Palace were stunning."},
        {"role": "assistant", "content": "Tokyo, Japan"},
        # Example 3
        {"role": "user", "content": "We took a gondola ride through the canals."},
        {"role": "assistant", "content": "Venice, Italy"},
        # Actual query
        {"role": "user", "content": "The street food near the Grand Bazaar was incredible."},
    ],
)
print(response.content[0].text)  # Istanbul, Turkey
```

#### Chain-of-Thought and Extended Thinking

```python
import anthropic

client = anthropic.Anthropic()

# Approach 1: Manual chain-of-thought prompt
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": (
                "A store has 3 shelves. Shelf A has twice as many books as shelf B. "
                "Shelf C has 10 more books than shelf A. "
                "If the total is 130 books, how many are on each shelf?\n\n"
                "Think step by step."
            ),
        },
    ],
)
print(response.content[0].text)

# Approach 2: Extended thinking — the model reasons internally before answering.
# The thinking tokens are visible in the response but billed separately.
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000,  # max tokens the model can use for internal reasoning
    },
    messages=[
        {
            "role": "user",
            "content": (
                "Find all bugs in this code and explain the fix for each:\n\n"
                "```python\n"
                "def merge_sorted(a, b):\n"
                "    result = []\n"
                "    i = j = 0\n"
                "    while i < len(a) and j < len(b):\n"
                "        if a[i] <= b[j]:\n"
                "            result.append(a[i])\n"
                "            i += 1\n"
                "        else:\n"
                "            result.append(b[j])\n"
                "            j += 1\n"
                "    return result\n"
                "```"
            ),
        },
    ],
)

# Response contains both thinking and text blocks
for block in response.content:
    if block.type == "thinking":
        print(f"[Internal reasoning — {len(block.thinking)} chars]")
    elif block.type == "text":
        print(block.text)
```

#### Structured Output — JSON via tool_use

```python
import anthropic
import json

client = anthropic.Anthropic()

# --- Approach 1: Ask for JSON in the prompt (fragile) ---
# Works but the model can include markdown fences, extra text, or invalid JSON.
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=256,
    messages=[
        {
            "role": "user",
            "content": (
                'Extract the name and age from this text. Reply with JSON only: '
                '{"name": "...", "age": ...}\n\n'
                "Text: Maria is a 34-year-old engineer from Porto."
            ),
        },
    ],
)
# Might work, might have ```json fences, might add commentary
raw = response.content[0].text
print(raw)


# --- Approach 2: Use tool_use to force structured output (reliable) ---
# Define a "tool" whose input_schema matches your desired output format.
# The model is forced to produce valid JSON matching the schema.
tools = [
    {
        "name": "extract_person",
        "description": "Extract structured person information from text.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Full name of the person",
                },
                "age": {
                    "type": "integer",
                    "description": "Age in years",
                },
                "occupation": {
                    "type": "string",
                    "description": "Job title or profession",
                },
                "location": {
                    "type": "string",
                    "description": "City or country of residence",
                },
            },
            "required": ["name", "age", "occupation", "location"],
        },
    }
]

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    tools=tools,
    tool_choice={"type": "tool", "name": "extract_person"},  # force this specific tool
    messages=[
        {
            "role": "user",
            "content": "Maria is a 34-year-old engineer from Porto.",
        },
    ],
)

# The response is guaranteed to be valid JSON matching the schema
for block in response.content:
    if block.type == "tool_use":
        data = block.input  # already a dict, no json.loads needed
        print(data)
        # {'name': 'Maria', 'age': 34, 'occupation': 'engineer', 'location': 'Porto'}

        # Use it directly
        print(f"{data['name']}, age {data['age']}, works as {data['occupation']}")
```

#### Prompt Templates — Dynamic Prompts with f-strings

```python
import anthropic

client = anthropic.Anthropic()


def analyze_code(code: str, language: str, focus: str = "bugs and security") -> str:
    """Reusable prompt template for code analysis."""
    system_prompt = (
        f"You are an expert {language} code reviewer. "
        f"Focus on: {focus}. "
        "Be concise. List issues as bullet points."
    )

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system_prompt,
        messages=[
            {"role": "user", "content": f"Review this {language} code:\n\n```{language}\n{code}\n```"},
        ],
    )
    return response.content[0].text


# Use the template with different inputs
python_code = """
def process_upload(file_path):
    with open(file_path) as f:
        data = eval(f.read())
    return data
"""
print(analyze_code(python_code, "Python"))
print("---")
print(analyze_code(python_code, "Python", focus="performance optimization"))
```

---

### 12. LLM Evaluation Patterns

#### Why Evaluation Matters

```text
The problem: most LLM development is "vibes-based" — you tweak a prompt,
eyeball a few outputs, and ship it. This breaks down because:
  - You can't tell if a prompt change helped or hurt across all cases.
  - Regressions sneak in. Fixing one edge case breaks another.
  - You can't compare approaches systematically.

The fix: treat LLM outputs like any other software — test them.
You can't improve what you don't measure.
```

#### Golden Dataset Pattern

```python
import anthropic
import json

client = anthropic.Anthropic()

# Step 1: Create a golden dataset — (input, expected_output) pairs.
# In practice, curate these from real user queries + human-verified answers.
golden_dataset = [
    {
        "input": "What's the capital of France?",
        "expected": "Paris",
    },
    {
        "input": "Convert 100 Celsius to Fahrenheit.",
        "expected": "212",
    },
    {
        "input": "What is the time complexity of binary search?",
        "expected": "O(log n)",
    },
    {
        "input": "Who wrote 'The Pragmatic Programmer'?",
        "expected": "Andy Hunt and Dave Thomas",
    },
]


def run_llm(question: str) -> str:
    """The LLM pipeline you're evaluating."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        system="Answer factual questions concisely in one sentence.",
        messages=[{"role": "user", "content": question}],
    )
    return response.content[0].text


def simple_score(expected: str, actual: str) -> float:
    """Check if the expected answer appears in the model's output."""
    return 1.0 if expected.lower() in actual.lower() else 0.0


# Step 2: Run evaluation
results = []
for example in golden_dataset:
    actual = run_llm(example["input"])
    score = simple_score(example["expected"], actual)
    results.append({
        "input": example["input"],
        "expected": example["expected"],
        "actual": actual,
        "score": score,
    })
    print(f"{'PASS' if score else 'FAIL'} | {example['input'][:50]}")

# Step 3: Aggregate
avg_score = sum(r["score"] for r in results) / len(results)
print(f"\nOverall accuracy: {avg_score:.0%} ({sum(r['score'] for r in results):.0f}/{len(results)})")
```

#### Model-as-Judge — Using Claude to Evaluate LLM Output

```python
import anthropic
import json

client = anthropic.Anthropic()

# The rubric defines what "good" looks like
EVAL_RUBRIC = """
Score the answer on three dimensions (1-5 each):

1. **Accuracy**: Is the information factually correct?
   5 = fully correct, 1 = contains major errors

2. **Completeness**: Does it address all parts of the question?
   5 = comprehensive, 1 = misses key aspects

3. **Clarity**: Is it well-structured and easy to understand?
   5 = crystal clear, 1 = confusing or incoherent
"""

# Use tool_use to get structured scores (reliable JSON output)
eval_tool = {
    "name": "submit_evaluation",
    "description": "Submit a structured evaluation of an LLM response.",
    "input_schema": {
        "type": "object",
        "properties": {
            "accuracy": {"type": "integer", "description": "1-5 score for factual accuracy"},
            "completeness": {"type": "integer", "description": "1-5 score for completeness"},
            "clarity": {"type": "integer", "description": "1-5 score for clarity"},
            "reasoning": {"type": "string", "description": "Brief explanation of scores"},
        },
        "required": ["accuracy", "completeness", "clarity", "reasoning"],
    },
}


def judge_response(question: str, answer: str) -> dict:
    """Use Claude as a judge to evaluate another model's response."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        tools=[eval_tool],
        tool_choice={"type": "tool", "name": "submit_evaluation"},
        system="You are an expert evaluator of AI-generated responses. Be strict but fair.",
        messages=[
            {
                "role": "user",
                "content": (
                    f"Evaluate this response against the rubric.\n\n"
                    f"**Question:** {question}\n\n"
                    f"**Answer:** {answer}\n\n"
                    f"**Rubric:**\n{EVAL_RUBRIC}"
                ),
            },
        ],
    )

    for block in response.content:
        if block.type == "tool_use":
            return block.input
    return {"error": "No evaluation returned"}


# Example: evaluate an answer
question = "Explain the difference between a list and a tuple in Python."
answer = "Lists use square brackets and tuples use parentheses. Lists are mutable."

scores = judge_response(question, answer)
print(f"Accuracy:     {scores['accuracy']}/5")
print(f"Completeness: {scores['completeness']}/5")
print(f"Clarity:      {scores['clarity']}/5")
print(f"Reasoning:    {scores['reasoning']}")
total = scores["accuracy"] + scores["completeness"] + scores["clarity"]
print(f"Total:        {total}/15")
```

#### Automated Eval Libraries

```text
deepeval — general-purpose LLM evaluation
  pip install deepeval
  - Built-in metrics: answer relevancy, faithfulness, hallucination, bias, toxicity
  - Supports custom metrics with LLM-as-judge under the hood
  - Integrates with pytest: write eval tests like unit tests
  - Usage: define test cases with input/actual_output/expected_output,
    run `deepeval test run test_eval.py`

ragas — specialized for RAG evaluation
  pip install ragas
  - Metrics designed specifically for retrieval-augmented generation:
    - Faithfulness: is the answer grounded in the retrieved context?
    - Answer relevancy: does the answer address the question?
    - Context recall: did retrieval find the right documents?
    - Context precision: are the retrieved documents relevant?
  - Works with LangChain and LlamaIndex out of the box
  - Usage: pass your questions, answers, contexts, and ground_truths
    to ragas.evaluate()
```

#### Key Metrics for RAG

```text
Metric             | What it measures                           | How to compute
-------------------|--------------------------------------------|------------------------------
Faithfulness       | Is the answer grounded in the context?     | Check if claims have support
                   | (i.e., no hallucination)                   | in retrieved docs
Answer relevancy   | Does the answer address the question?      | Semantic similarity between
                   |                                            | question and answer
Context recall     | Did retrieval find the right documents?    | Compare retrieved docs to
                   |                                            | ground truth docs
Context precision  | Are the top-ranked docs the most relevant? | Check ranking quality of
                   |                                            | retrieved documents

Start here:
  - Faithfulness is the most critical metric — a RAG system that hallucinates
    is worse than one that says "I don't know."
  - Answer relevancy catches cases where the model gives a correct but
    off-topic answer.
```

#### Practical Eval Advice

```text
1. Start small: ~50 golden examples is enough to catch major regressions.
   You don't need 1000 examples to get started.

2. Eval every prompt change. Even "minor" wording tweaks can cause regressions.
   Run your eval suite before and after.

3. Track scores over time. Log eval results with timestamps so you can
   see trends (use W&B, MLflow, or even a CSV).

4. Mix automated and human eval. Automated metrics catch regressions;
   periodic human review catches subtle quality issues.

5. Eval the whole pipeline, not just the model. For RAG: test retrieval
   quality separately from generation quality. A bad retriever makes
   even a perfect model fail.
```

---

### 13. Model Context Protocol (MCP)

#### What MCP Is

```text
MCP (Model Context Protocol) is an open standard for connecting LLMs to
external data sources and tools. Think of it as a universal adapter between
AI models and the systems they need to interact with.

Without MCP: every LLM host (Claude Desktop, VS Code, your app) implements
its own custom integration for each tool/data source. N hosts x M tools
= N*M integrations.

With MCP: each tool exposes a standard MCP server. Each host implements
one MCP client. N hosts + M tools = N+M integrations.

The protocol covers three capability types:
  - Tools:      functions the model can call (like tool_use)
  - Resources:  data the model can read (files, DB records, API responses)
  - Prompts:    reusable prompt templates exposed by the server
```

#### Architecture

```text
┌─────────────────┐     MCP Protocol     ┌─────────────────┐
│   MCP Client    │ ◄──────────────────► │   MCP Server    │
│  (LLM Host)     │    JSON-RPC over     │  (Your Tools)   │
│                 │    stdio / SSE        │                 │
│ - Claude Desktop│                      │ - Weather API   │
│ - Claude Code   │                      │ - Database       │
│ - Your own app  │                      │ - File system    │
└─────────────────┘                      └─────────────────┘

The flow:
  1. Client connects to server and discovers available tools/resources
  2. User sends a message to the LLM
  3. LLM decides to call a tool → client sends the call to the MCP server
  4. Server executes the tool and returns the result
  5. Result is sent back to the LLM for the final response
```

#### Python MCP SDK — Building a Server

```python
# pip install mcp
from mcp.server.fastmcp import FastMCP

# Create an MCP server
mcp = FastMCP("demo-server")


# Define tools with the @mcp.tool() decorator.
# The docstring becomes the tool description that the LLM sees.
# Type hints are used to generate the input schema automatically.
@mcp.tool()
def get_weather(city: str, unit: str = "celsius") -> str:
    """Get the current weather for a city.

    Args:
        city: City name, e.g. 'San Francisco'
        unit: Temperature unit — 'celsius' or 'fahrenheit'
    """
    # In production, call a real weather API
    fake_data = {
        "san francisco": {"temp": 18, "condition": "foggy"},
        "tokyo": {"temp": 24, "condition": "sunny"},
        "london": {"temp": 12, "condition": "rainy"},
    }
    weather = fake_data.get(city.lower(), {"temp": 20, "condition": "unknown"})
    temp = weather["temp"]
    if unit == "fahrenheit":
        temp = temp * 9 / 5 + 32
    return f"{city}: {temp}°{'F' if unit == 'fahrenheit' else 'C'}, {weather['condition']}"


@mcp.tool()
def query_database(sql: str) -> str:
    """Run a read-only SQL query against the application database.

    Args:
        sql: A SELECT query. Write operations are not allowed.
    """
    if not sql.strip().upper().startswith("SELECT"):
        return "Error: only SELECT queries are allowed."

    # In production, connect to a real database
    fake_results = [
        {"id": 1, "name": "Alice", "role": "engineer"},
        {"id": 2, "name": "Bob", "role": "designer"},
    ]
    import json
    return json.dumps(fake_results, indent=2)


# Resources let you expose data that the LLM can read
@mcp.resource("config://app")
def get_app_config() -> str:
    """Return the current application configuration."""
    import json
    return json.dumps({
        "version": "2.1.0",
        "environment": "production",
        "features": ["auth", "search", "notifications"],
    })


# Run the server
if __name__ == "__main__":
    mcp.run()
```

#### Running and Testing an MCP Server

```bash
# Run the server (stdio transport — used by Claude Desktop, Claude Code)
mcp run server.py

# Run with the MCP Inspector for interactive testing
mcp dev server.py

# The inspector opens a web UI where you can:
#   - See all discovered tools, resources, and prompts
#   - Call tools manually and inspect results
#   - Debug the JSON-RPC messages

# To use with Claude Desktop, add to your claude_desktop_config.json:
# {
#   "mcpServers": {
#     "demo": {
#       "command": "mcp",
#       "args": ["run", "/path/to/server.py"]
#     }
#   }
# }
```

#### MCP vs Direct tool_use — When to Use Which

```text
Direct tool_use (Anthropic API):
  - You control both the LLM client and the tool implementations.
  - Simple integration — define tools inline in your API call.
  - Best for: single-app use cases, quick prototypes, serverless functions.

  Example: you have a FastAPI app that calls Claude with 3 custom tools.
  The tools are specific to your app and won't be reused elsewhere.

MCP:
  - You want tools to be reusable across different LLM hosts
    (Claude Desktop, Claude Code, VS Code, Cursor, your own apps).
  - You want to use existing MCP servers from the ecosystem
    (there are community servers for GitHub, Slack, databases, etc.).
  - You want to separate tool logic from LLM orchestration.

  Example: you build an MCP server for your company's internal APIs.
  Now everyone can use those tools from Claude Desktop, Claude Code,
  or any MCP-compatible client — without writing integration code.

How they relate:
  MCP servers expose tools → MCP client discovers them → client translates
  them into tool_use calls in the Anthropic API. Under the hood, MCP
  tools become tool_use definitions. MCP standardizes the discovery and
  transport layer; tool_use is the execution mechanism.
```

---

## 5c. Infrastructure

---

### 14. Vector DBs — ChromaDB and pgvector

#### ChromaDB

```python
# pip install chromadb
import chromadb

# Create a persistent client (data saved to disk)
client = chromadb.PersistentClient(path="./chroma_db")

# Or ephemeral (in-memory, for testing)
# client = chromadb.EphemeralClient()

# Create a collection
collection = client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"},  # distance metric
)

# Add documents — ChromaDB auto-generates embeddings using a default model
collection.add(
    documents=[
        "Python is a high-level programming language.",
        "Machine learning is a subset of artificial intelligence.",
        "Docker containers provide isolated environments.",
        "PostgreSQL is a powerful relational database.",
        "FastAPI is a modern Python web framework.",
    ],
    metadatas=[
        {"category": "programming"},
        {"category": "ai"},
        {"category": "devops"},
        {"category": "database"},
        {"category": "web"},
    ],
    ids=["doc1", "doc2", "doc3", "doc4", "doc5"],
)

print(f"Collection has {collection.count()} documents")

# Query by text (auto-embeds the query)
results = collection.query(
    query_texts=["What is AI?"],
    n_results=3,
)
for doc, dist, meta in zip(
    results["documents"][0],
    results["distances"][0],
    results["metadatas"][0],
):
    print(f"  [{dist:.4f}] ({meta['category']}) {doc}")

# Query with metadata filter
results = collection.query(
    query_texts=["programming tools"],
    n_results=3,
    where={"category": {"$in": ["programming", "web"]}},
)
print("\nFiltered results:")
for doc in results["documents"][0]:
    print(f"  {doc}")

# Update a document
collection.update(
    ids=["doc1"],
    documents=["Python is a versatile, high-level programming language used in AI and web dev."],
)

# Delete
collection.delete(ids=["doc3"])
print(f"After delete: {collection.count()} documents")

# Using custom embeddings
# collection = client.create_collection(
#     name="custom",
#     embedding_function=my_embedding_function,
# )
```

#### pgvector

```sql
-- Setup (run once)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(384)  -- dimension matches your embedding model
);

-- Create an index for fast similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
-- For smaller datasets or higher recall, use HNSW:
-- CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
```

```python
# pip install psycopg2-binary pgvector sentence-transformers
import psycopg2
from pgvector.psycopg2 import register_vector
from sentence_transformers import SentenceTransformer
import numpy as np

# Connect and register the vector type
conn = psycopg2.connect("dbname=mydb user=postgres")
register_vector(conn)
cur = conn.cursor()

# Embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")  # 384 dimensions

# Insert documents with embeddings
documents = [
    "Python is great for data science.",
    "PostgreSQL supports JSONB and full-text search.",
    "Vector databases enable semantic search.",
]

for doc in documents:
    embedding = model.encode(doc)
    cur.execute(
        "INSERT INTO documents (content, embedding) VALUES (%s, %s)",
        (doc, embedding.tolist()),
    )
conn.commit()

# Similarity search
query = "How do I search by meaning?"
query_embedding = model.encode(query)

cur.execute(
    """
    SELECT content, 1 - (embedding <=> %s::vector) AS similarity
    FROM documents
    ORDER BY embedding <=> %s::vector
    LIMIT 3
    """,
    (query_embedding.tolist(), query_embedding.tolist()),
)

print("Similar documents:")
for content, similarity in cur.fetchall():
    print(f"  [{similarity:.4f}] {content}")

# Filtered similarity search
cur.execute(
    """
    SELECT content, 1 - (embedding <=> %s::vector) AS similarity
    FROM documents
    WHERE metadata @> '{"category": "tech"}'
    ORDER BY embedding <=> %s::vector
    LIMIT 3
    """,
    (query_embedding.tolist(), query_embedding.tolist()),
)

cur.close()
conn.close()
```

---

### 15. MLOps — Weights & Biases and MLflow

#### Weights & Biases (W&B)

```python
# pip install wandb scikit-learn
import wandb
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
import numpy as np

# Initialize a run
wandb.init(
    project="iris-classification",
    config={
        "n_estimators": 100,
        "max_depth": 5,
        "random_state": 42,
    },
)

config = wandb.config
X, y = load_iris(return_X_y=True)

# Sweep over hyperparameters
for n_est in [50, 100, 200]:
    for depth in [3, 5, 10, None]:
        clf = RandomForestClassifier(
            n_estimators=n_est,
            max_depth=depth,
            random_state=42,
        )
        scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")

        # Log metrics
        wandb.log({
            "n_estimators": n_est,
            "max_depth": depth if depth else 0,
            "mean_accuracy": scores.mean(),
            "std_accuracy": scores.std(),
        })

# Log a final summary
wandb.summary["best_accuracy"] = 0.97

# Log artifacts (models, datasets, etc.)
clf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
clf.fit(X, y)

import joblib
joblib.dump(clf, "model.pkl")

artifact = wandb.Artifact("iris-model", type="model")
artifact.add_file("model.pkl")
wandb.log_artifact(artifact)

wandb.finish()

# --- W&B Sweep (hyperparameter search) ---
sweep_config = {
    "method": "bayes",
    "metric": {"name": "mean_accuracy", "goal": "maximize"},
    "parameters": {
        "n_estimators": {"values": [50, 100, 200, 500]},
        "max_depth": {"values": [3, 5, 10, 20]},
    },
}

def train():
    with wandb.init() as run:
        cfg = run.config
        clf = RandomForestClassifier(
            n_estimators=cfg.n_estimators,
            max_depth=cfg.max_depth,
            random_state=42,
        )
        scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")
        wandb.log({"mean_accuracy": scores.mean()})

sweep_id = wandb.sweep(sweep_config, project="iris-sweep")
wandb.agent(sweep_id, function=train, count=10)
```

#### MLflow

```python
# pip install mlflow scikit-learn
import mlflow
import mlflow.sklearn
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import accuracy_score

# Set tracking URI (local file store by default)
mlflow.set_tracking_uri("mlruns")
mlflow.set_experiment("iris-classification")

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Run an experiment
for n_est in [50, 100, 200]:
    for depth in [3, 5, None]:
        with mlflow.start_run(run_name=f"rf_{n_est}_{depth}"):
            # Log parameters
            mlflow.log_param("n_estimators", n_est)
            mlflow.log_param("max_depth", depth)

            # Train
            clf = RandomForestClassifier(
                n_estimators=n_est,
                max_depth=depth,
                random_state=42,
            )
            clf.fit(X_train, y_train)

            # Evaluate
            train_acc = accuracy_score(y_train, clf.predict(X_train))
            test_acc = accuracy_score(y_test, clf.predict(X_test))
            cv_scores = cross_val_score(clf, X_train, y_train, cv=5)

            # Log metrics
            mlflow.log_metric("train_accuracy", train_acc)
            mlflow.log_metric("test_accuracy", test_acc)
            mlflow.log_metric("cv_mean_accuracy", cv_scores.mean())
            mlflow.log_metric("cv_std_accuracy", cv_scores.std())

            # Log model
            mlflow.sklearn.log_model(clf, "model")

            print(f"n_est={n_est}, depth={depth}: "
                  f"test_acc={test_acc:.3f}, cv={cv_scores.mean():.3f}")

# --- Load and use a logged model ---
# Find the best run
best_run = mlflow.search_runs(order_by=["metrics.test_accuracy DESC"]).iloc[0]
print(f"\nBest run: {best_run['run_id']}")
print(f"Best test accuracy: {best_run['metrics.test_accuracy']:.3f}")

# Load the model from the best run
model_uri = f"runs:/{best_run['run_id']}/model"
loaded_model = mlflow.sklearn.load_model(model_uri)
preds = loaded_model.predict(X_test)
print(f"Loaded model accuracy: {accuracy_score(y_test, preds):.3f}")

# --- Launch the UI ---
# Run in terminal: mlflow ui
# Then visit http://localhost:5000
```

---

### 16. Complete Project: RAG Application

A full RAG app using LlamaIndex + ChromaDB + Claude API.

```python
"""
RAG Application: Document Q&A with LlamaIndex + ChromaDB + Claude

pip install llama-index llama-index-llms-anthropic llama-index-embeddings-huggingface \
            llama-index-vector-stores-chroma chromadb
"""

import os
import chromadb
from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    Document,
    Settings,
    StorageContext,
)
from llama_index.llms.anthropic import Anthropic
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore


# ============================================================
# 1. Configuration
# ============================================================
CHROMA_DB_PATH = "./rag_chroma_db"
COLLECTION_NAME = "knowledge_base"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
LLM_MODEL = "claude-sonnet-4-20250514"


def get_settings():
    """Configure global LlamaIndex settings."""
    Settings.llm = Anthropic(model=LLM_MODEL, max_tokens=1024)
    Settings.embed_model = HuggingFaceEmbedding(model_name=EMBEDDING_MODEL)
    Settings.chunk_size = 512
    Settings.chunk_overlap = 50


# ============================================================
# 2. Document Ingestion
# ============================================================
def create_sample_documents() -> list[Document]:
    """Create sample documents. Replace with SimpleDirectoryReader for real files."""
    raw_texts = [
        {
            "text": (
                "Python 3.12 Release Notes\n\n"
                "Python 3.12 was released on October 2, 2023. Key features include:\n"
                "- Type parameter syntax (PEP 695): Use 'type X = int | str' for type aliases\n"
                "- Per-interpreter GIL (PEP 684): Each sub-interpreter gets its own GIL\n"
                "- Improved error messages with more helpful suggestions\n"
                "- F-string improvements: arbitrary expressions, backslashes, and comments\n"
                "- Buffer protocol accessible from Python (PEP 688)\n"
                "- Performance improvements: 5% faster on average than 3.11"
            ),
            "metadata": {"source": "python_release_notes.md", "version": "3.12"},
        },
        {
            "text": (
                "Python 3.13 Release Notes\n\n"
                "Python 3.13 was released on October 7, 2024. Key features include:\n"
                "- Experimental free-threaded mode (PEP 703): disable the GIL with --disable-gil\n"
                "- Experimental JIT compiler (PEP 744): copy-and-patch JIT for performance\n"
                "- Improved interactive interpreter based on PyPy's\n"
                "- Improved error messages with color support\n"
                "- Deprecation of PGP signatures for releases\n"
                "- locals() now has defined semantics (PEP 667)"
            ),
            "metadata": {"source": "python_release_notes.md", "version": "3.13"},
        },
        {
            "text": (
                "FastAPI Best Practices\n\n"
                "1. Use Pydantic models for request/response validation.\n"
                "2. Use dependency injection for database sessions and auth.\n"
                "3. Organize routes with APIRouter for modularity.\n"
                "4. Use async endpoints for I/O-bound operations.\n"
                "5. Add middleware for CORS, logging, and error handling.\n"
                "6. Use BackgroundTasks for non-blocking operations.\n"
                "7. Write tests with TestClient and pytest.\n"
                "8. Use lifespan events for startup/shutdown logic."
            ),
            "metadata": {"source": "fastapi_guide.md", "topic": "web"},
        },
        {
            "text": (
                "Docker Containerization Guide\n\n"
                "Multi-stage builds reduce image size:\n"
                "  Stage 1 (builder): Install dependencies, build the app\n"
                "  Stage 2 (runtime): Copy only the built artifacts\n\n"
                "Best practices:\n"
                "- Use specific base image tags, not 'latest'\n"
                "- Combine RUN commands to reduce layers\n"
                "- Use .dockerignore to exclude unnecessary files\n"
                "- Run as non-root user for security\n"
                "- Use health checks for orchestration"
            ),
            "metadata": {"source": "docker_guide.md", "topic": "devops"},
        },
        {
            "text": (
                "SQLAlchemy 2.0 Migration Guide\n\n"
                "Key changes from 1.x to 2.0:\n"
                "- Use 'select()' instead of 'Query' objects\n"
                "- Session.execute() returns Result objects\n"
                "- Mapped classes use 'Mapped' and 'mapped_column'\n"
                "- DeclarativeBase replaces declarative_base()\n"
                "- 2.0-style queries: session.execute(select(User).where(User.id == 1))\n"
                "- Connection-level execution is now the norm\n"
                "- Type stubs are built-in, no need for sqlalchemy-stubs"
            ),
            "metadata": {"source": "sqlalchemy_migration.md", "topic": "database"},
        },
    ]

    return [Document(text=d["text"], metadata=d["metadata"]) for d in raw_texts]


def load_documents_from_directory(directory: str) -> list[Document]:
    """Load documents from a directory. Supports .txt, .pdf, .md, .docx, etc."""
    reader = SimpleDirectoryReader(
        input_dir=directory,
        recursive=True,
        required_exts=[".txt", ".md", ".pdf"],
    )
    return reader.load_data()


# ============================================================
# 3. Indexing with ChromaDB
# ============================================================
def build_index(documents: list[Document]) -> VectorStoreIndex:
    """Build a vector index backed by ChromaDB."""
    # Initialize ChromaDB
    chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    chroma_collection = chroma_client.get_or_create_collection(COLLECTION_NAME)

    # Create LlamaIndex vector store backed by Chroma
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    # Build index (embeds and stores all documents)
    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True,
    )
    print(f"Indexed {len(documents)} documents into ChromaDB.")
    return index


def load_existing_index() -> VectorStoreIndex:
    """Load an existing index from ChromaDB (no re-embedding)."""
    chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    chroma_collection = chroma_client.get_collection(COLLECTION_NAME)

    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    return VectorStoreIndex.from_vector_store(vector_store)


# ============================================================
# 4. Querying
# ============================================================
def query_index(index: VectorStoreIndex, question: str) -> str:
    """Query the index and return an answer with sources."""
    query_engine = index.as_query_engine(
        similarity_top_k=3,
        response_mode="compact",  # "compact", "refine", "tree_summarize"
    )

    response = query_engine.query(question)

    # Format response with sources
    output = f"Answer: {response}\n\nSources:"
    for i, node in enumerate(response.source_nodes, 1):
        source = node.node.metadata.get("source", "unknown")
        score = node.score or 0.0
        snippet = node.node.text[:100].replace("\n", " ")
        output += f"\n  {i}. [{score:.4f}] {source}: {snippet}..."

    return output


def chat_with_index(index: VectorStoreIndex):
    """Interactive chat loop with conversation memory."""
    chat_engine = index.as_chat_engine(
        chat_mode="condense_plus_context",
        similarity_top_k=3,
        verbose=False,
    )

    print("RAG Chat (type 'quit' to exit)")
    print("-" * 40)

    while True:
        question = input("\nYou: ").strip()
        if question.lower() in ("quit", "exit", "q"):
            break
        if not question:
            continue

        response = chat_engine.chat(question)
        print(f"\nAssistant: {response}")


# ============================================================
# 5. Main — putting it all together
# ============================================================
def main():
    get_settings()

    # Step 1: Prepare documents
    documents = create_sample_documents()
    # Or from files: documents = load_documents_from_directory("./docs")

    # Step 2: Build index (first run) or load existing (subsequent runs)
    index = build_index(documents)
    # index = load_existing_index()  # use this after first run

    # Step 3: Query
    questions = [
        "What are the key features of Python 3.13?",
        "How do I optimize Docker images?",
        "What changed in SQLAlchemy 2.0?",
    ]

    for q in questions:
        print(f"\n{'='*60}")
        print(f"Q: {q}")
        print(query_index(index, q))

    # Step 4: Interactive chat (uncomment to use)
    # chat_with_index(index)


if __name__ == "__main__":
    main()
```

#### Project Structure for Production

```text
rag-app/
├── pyproject.toml
├── src/
│   └── rag_app/
│       ├── __init__.py
│       ├── config.py          # Settings, env vars
│       ├── ingest.py          # Document loading and indexing
│       ├── query.py           # Query engine and chat
│       ├── embeddings.py      # Embedding model wrapper
│       └── api.py             # FastAPI endpoints (optional)
├── data/
│   └── documents/             # Source documents
├── tests/
│   ├── test_ingest.py
│   └── test_query.py
└── scripts/
    ├── ingest.sh              # Run document ingestion
    └── serve.sh               # Start API server
```

```python
# src/rag_app/api.py — Optional FastAPI wrapper
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="RAG API")

# Initialize on startup
index = None

@app.on_event("startup")
async def startup():
    global index
    from rag_app.config import get_settings
    from rag_app.ingest import load_existing_index
    get_settings()
    index = load_existing_index()

class QueryRequest(BaseModel):
    question: str
    top_k: int = 3

class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]

@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    query_engine = index.as_query_engine(similarity_top_k=req.top_k)
    response = query_engine.query(req.question)

    sources = [
        {
            "text": n.node.text[:200],
            "source": n.node.metadata.get("source", "unknown"),
            "score": n.score,
        }
        for n in response.source_nodes
    ]

    return QueryResponse(answer=str(response), sources=sources)
```

---

This concludes Phase 5. The key takeaway: the AI/ML Python ecosystem is large but follows consistent patterns. NumPy, scikit-learn, and PyTorch form the computational foundation. The LLM libraries (Anthropic, OpenAI, HuggingFace, LangChain, LlamaIndex) all follow a similar client-configure-call pattern. Infrastructure tools (ChromaDB, pgvector, W&B, MLflow) handle the storage and tracking that production systems require.
