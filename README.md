# 🍶 Sake

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Navi](https://img.shields.io/badge/Navi-0.16+-blue.svg)](https://navi-lang.org)

**Sake** is a lightweight, high-performance web framework for the [Navi](https://navi-lang.org) programming language. Inspired by Go's [Gin](https://github.com/gin-gonic/gin), Sake provides a clean, ergonomic API for building HTTP servers and APIs.

## ✨ Features

- **Simple & Elegant API** - Gin-inspired design, easy to learn
- **High Performance** - Leverages Navi's async I/O with `spawn` + `channel`
- **Optional Parallelism** - `WorkerPool` support for CPU-intensive routes
- **Middleware Support** - Flexible middleware chain with `ctx.next()`
- **Router Groups** - Organize routes with common prefixes and middleware
- **Request Binding** - Parse query strings, forms, JSON, headers, and URI parameters
- **Cookie Support** - Full cookie handling with secure options
- **Type-Safe** - Full Navi type safety with Optional types and error handling
- **90% Gin Parity** - Most Gin features implemented with idiomatic Navi code

## 🚀 Quick Start

```nv
use src.Engine;

fn main() throws {
    let app = Engine.default();

    // Simple route
    app.get("/", |ctx| {
        ctx.string("Hello, Sake! 🍶");
    });

    // JSON response with path parameter
    app.get("/api/users/:id", |ctx| {
        let id = ctx.param("id");
        try? ctx.json({
            "id": id,
            "name": "Navi User",
        });
    });

    // CPU-intensive route with WorkerPool
    app.get("/compute/:n", |ctx| {
        let n = try? ctx.param("n")?.parse::<int>() || 10;
        let result = expensive_computation(n);
        try? ctx.json({"result": result});
    }).worker();  // ← Executes in parallel worker threads

    // Start server
    try app.run(":8080");
}
```

See [examples/](examples/) for more complete examples.

## 📦 Installation

Add Sake to your `navi.toml`:

```toml
[dependencies]
sake = "0.1"
```

## ⚙️ Configuration

```nv
use src.{Engine, Config};

let config = Config.default()
    .with_worker_pool_size(8)       // 8 worker threads (0 = auto-detect)
    .with_max_connections(10000)    // Max concurrent connections
    .with_request_timeout(30000)    // 30 second timeout
    .with_keep_alive(true)           // Enable Keep-Alive (default)
    .with_keep_alive_timeout(30000); // 30 second idle timeout (default)

let app = Engine.new(config);
```

**Configuration Options:**

- `worker_pool_size` - Number of worker threads (0 = auto-detect via `vm.num_cpus()`)
- `enable_worker_pool` - Enable/disable WorkerPool (default: true)
- `max_connections` - Maximum concurrent connections (default: 10000)
- `request_timeout` - Request timeout in milliseconds (default: 30000)
- `enable_keep_alive` - Enable HTTP Keep-Alive connection reuse (default: true)
- `keep_alive_timeout` - Keep-Alive idle timeout in milliseconds (default: 30000)
- `max_requests_per_connection` - Max requests per Keep-Alive connection (default: 100)

## 📖 Documentation

- [Getting Started](docs/getting-started.md)
- [Routing](docs/routing.md)
- [Middleware](docs/middleware.md)
- [Context API](docs/context.md)
- [Parallelism Guide](docs/parallelism.md)
- [API Reference](docs/api-reference.md)

## 🏗️ Architecture

Sake uses a **dual-mode hybrid concurrency architecture** that automatically selects the optimal execution strategy:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Sake Framework - Dual-Mode Architecture                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────┐      ┌─────────────────────┐  │
│  │  Spawn-Only Mode    │      │  WorkerPool Mode    │  │
│  │  (Default)          │      │  (CPU-intensive)    │  │
│  └─────────────────────┘      └─────────────────────┘  │
│           │                              │               │
│           │                              │               │
│           ▼                              ▼               │
│   Main Thread Accept          Accept Loop in Spawn      │
│   Each Connection → Spawn     Main Thread → WorkerPool  │
│                               Channel Coordination       │
└─────────────────────────────────────────────────────────┘
```

### Mode 1: Spawn-Only (I/O-Bound Routes)

**When:** WorkerPool disabled or no routes use `.worker()`

**Architecture:**
```
Main Thread (Accept Loop)
    │
    ├─→ Connection 1 → spawn { handle_connection() }
    ├─→ Connection 2 → spawn { handle_connection() }
    ├─→ Connection 3 → spawn { handle_connection() }
    └─→ Connection N → spawn { handle_connection() }

Each spawn task:
  - Parse HTTP request
  - Match route
  - Execute handler
  - Send response
```

**Characteristics:**
- ✅ Simple and efficient for I/O-bound workloads
- ✅ Single-threaded cooperative concurrency
- ✅ Low memory overhead (~1KB per connection)
- ✅ Non-blocking I/O operations
- ✅ Thousands of concurrent connections
- ✅ HTTP Keep-Alive support for connection reuse

**Implementation:**
```nv
// Main thread runs accept loop
loop {
    let stream = listener.accept();

    // Each connection handled in spawn
    spawn {
        let stream = stream;
        defer { try? stream.close(); }

        // Read, parse, route, execute, respond
        try? self.handle_connection(stream);
    }
}
```

**Use cases:**
```nv
// Database queries - I/O-bound
app.get("/api/users", |ctx| {
    let users = db.query("SELECT * FROM users");
    try? ctx.json(users);
});

// HTTP/API calls - I/O-bound
app.get("/api/weather", |ctx| {
    let data = http.get("https://api.weather.com");
    try? ctx.json(data);
});

// File operations - I/O-bound
app.get("/files/:name", |ctx| {
    let content = fs.read_file(ctx.param("name"));
    ctx.data("application/octet-stream", content);
});
```

### Mode 2: WorkerPool with Channel Coordination (CPU-Bound Routes)

**When:** WorkerPool enabled AND routes use `.worker()`

**Why Channel Coordination?**

⚠️ **Technical Constraint:** Navi's `spawn` uses single-threaded cooperative concurrency. Calling `Worker.pool.map()` (a blocking operation) from within spawn causes permanent deadlock:

```nv
// ❌ This DOES NOT WORK - causes deadlock!
spawn {
    let response = Worker.pool.map(...);  // Blocks forever
}
```

**Solution:** Channel-based coordination separates concerns:
- **Accept loop** runs in spawn (handles I/O)
- **Main thread** processes WorkerPool tasks (handles CPU)
- **Channels** coordinate between them (non-blocking communication)

**Architecture:**

```
Spawn Thread (I/O Layer)              Main Thread (CPU Layer)
    │                                        │
    ├─ Accept connections                   │
    ├─ Parse HTTP requests                  │
    ├─ Match routes                         │
    │                                        │
    ├─ For .worker() routes:                │
    │   └─> Send task via channel ────────> │
    │                                        ├─ Receive task
    │                                        ├─ Worker.pool.map() ← Blocking OK here!
    │                                        └─ Send response
    │   <──────── Receive response ──────── │
    │                                        │
    └─ Send HTTP response                   │
```

**Implementation:**

```nv
// Accept loop in spawn (I/O layer)
spawn {
    loop {
        let stream = listener.accept();
        try? handle_connection_worker_mode(stream, worker_task_ch);
    }
}

// Connection handler (in spawn context)
fn handle_connection_worker_mode(stream, worker_task_ch) {
    if (route.worker_mode == Worker) {
        // Serialize context
        let ctx_json = serialize(ctx);

        // Create response channel
        let response_ch = channel::<WorkerResponse>();

        // Send task to main thread
        worker_task_ch.send(WorkerTask {
            ctx_json,
            response_ch,
        });

        // Wait for response (yields, doesn't block)
        let response = response_ch.recv();

        // Send HTTP response
        stream.write(response);
    }
}

// Main thread (CPU layer)
while (true) {
    // Receive task (blocking - OK in main thread)
    let task = worker_task_ch.recv();

    // Execute in WorkerPool (parallel)
    let response = Worker.pool.map(task.ctx_json);

    // Send response back to spawn
    task.response_ch.send(response);
}
```

**Use cases:**

```nv
// Heavy computation - uses WorkerPool
app.get("/compute/fibonacci/:n", |ctx| {
    let n = try? ctx.param("n")?.parse::<int>() || 10;
    let result = fibonacci(n);  // CPU-intensive
    try? ctx.json({"result": result});
}).worker();  // ← Enable WorkerPool

// Image processing - uses WorkerPool
app.post("/images/resize", |ctx| {
    let image = ctx.body();
    let resized = resize_image(image, 800, 600);
    ctx.data("image/png", resized);
}).worker();

// Cryptography - uses WorkerPool
app.post("/hash", |ctx| {
    let data = ctx.body();
    let hash = sha256_intensive(data);
    ctx.string(hash);
}).worker();
```

### Complete Request Flow

#### Spawn-Only Mode Flow

```
1. Connection arrives → Main thread
2. Main thread spawns handler
3. Spawn: Parse HTTP request
4. Spawn: Match route
5. Spawn: Execute handler
6. Spawn: Send response
7. Spawn: Close connection (defer)
```

#### WorkerPool Mode Flow

```
1. Connection arrives → Accept spawn
2. Accept spawn: Parse HTTP request
3. Accept spawn: Match route
4. Check route.worker_mode:

   ├─ If Worker Mode:
   │  ├─ Spawn: Serialize context → JSON
   │  ├─ Spawn: Create response channel
   │  ├─ Spawn: Send task to main thread
   │  ├─ Main thread: Receive task
   │  ├─ Main thread: Worker.pool.map(task) ← Parallel execution!
   │  ├─ Main thread: Send response back
   │  └─ Spawn: Receive response, send HTTP
   │
   └─ Else (Default):
      └─ Spawn: Execute handler directly

5. Spawn: Send HTTP response
6. Spawn: Close connection (defer)
```

### Performance Characteristics

**Benchmark Results** (wrk -t 4 -c 100 -d 30s):

| Mode | Architecture | RPS | Latency (avg) | Use Case | Scalability |
|------|-------------|-----|---------------|----------|-------------|
| **Spawn-Only + Keep-Alive** | Main accept + spawn | 45,000+ | ~2.2ms | I/O-bound | ✅ Excellent |
| **Spawn-Only (no Keep-Alive)** | Main accept + spawn | 5,000-8,000 | ~3.5ms | I/O-bound | ✅ Excellent |
| **WorkerPool** | Channel coordination | 7,500-8,500 | ~12ms | CPU-bound | ✅ Excellent |

> **Note:** Keep-Alive is enabled by default and provides ~8x throughput improvement by reusing TCP connections.

**Resource Usage:**

| Mode | Memory/Connection | CPU Usage | Thread Count | Max Connections |
|------|------------------|-----------|--------------|-----------------|
| **Spawn-Only** | ~1KB | Single core | 1 | 10,000+ |
| **WorkerPool** | ~2KB | Multi-core | 1 + workers | 10,000+ |

### When to Use Each Mode

#### Use Spawn-Only Mode (Default) When:
- ✅ Most routes are I/O-bound
- ✅ Database queries, API calls, file operations
- ✅ Response time < 10ms per request
- ✅ Need to handle many concurrent connections
- ✅ Want simplest possible architecture

#### Use WorkerPool Mode When:
- ✅ CPU-intensive computations (>100ms)
- ✅ Image/video processing
- ✅ Cryptography operations
- ✅ Data transformation
- ✅ Machine learning inference
- ✅ Heavy JSON/XML parsing

### Configuration

```nv
use src.{Engine, Config};

fn main() throws {
    // Spawn-Only Mode (default)
    let app1 = Engine.new(Config.with_defaults()
        .with_worker_pool(false));

    // WorkerPool Mode
    let app2 = Engine.new(Config.with_defaults()
        .with_worker_pool(true)
        .with_worker_pool_size(8));  // 0 = auto-detect CPU count

    // Mixed: I/O routes use spawn, CPU routes use workers
    app2.get("/api/users", handler);           // Uses spawn
    app2.get("/compute", handler).worker();    // Uses WorkerPool

    try app2.run(":8080");
}

### Practical Examples

#### Example 1: Pure I/O-Bound Application (Spawn-Only)

```nv
use src.{Engine, Config};

fn main() throws {
    let config = Config.with_defaults()
        .with_worker_pool(false)       // Disable WorkerPool
        .with_max_connections(10000);   // Handle 10K concurrent connections

    let app = Engine.new(config);

    // All routes use spawn (no WorkerPool overhead)
    app.get("/api/users", |ctx| {
        let users = db.query("SELECT * FROM users");
        try? ctx.json(users);
    });

    app.get("/api/posts/:id", |ctx| {
        let post = db.find_post(ctx.param("id"));
        try? ctx.json(post);
    });

    try app.run(":8080");
}
```

#### Example 2: Mixed Application (Spawn + WorkerPool)

```nv
use src.{Engine, Config};

fn main() throws {
    let config = Config.with_defaults()
        .with_worker_pool(true)           // Enable WorkerPool
        .with_worker_pool_size(8)         // 8 worker threads (0 = auto)
        .with_max_connections(10000);

    let app = Engine.new(config);

    // I/O-bound routes: use spawn (default)
    app.get("/api/users", |ctx| {
        let users = db.query("SELECT * FROM users");
        try? ctx.json(users);
    });

    // CPU-bound routes: use WorkerPool
    app.get("/compute/prime/:n", |ctx| {
        let n = try? ctx.param("n")?.parse::<int>() || 1000;
        let primes = compute_primes(n);  // CPU-intensive
        try? ctx.json({"primes": primes});
    }).worker();  // ← Enable WorkerPool for this route

    app.post("/images/resize", |ctx| {
        let image = ctx.body();
        let resized = resize_image(image, 800, 600);
        ctx.data("image/png", resized);
    }).worker();  // ← CPU-intensive image processing

    try app.run(":8080");
}
```

#### Example 3: High-Performance API Server

```nv
use src.{Engine, Config};

fn main() throws {
    // Optimize for throughput
    let config = Config.with_defaults()
        .with_worker_pool_size(0)        // Auto-detect CPU count
        .with_max_connections(20000);     // High connection limit

    let app = Engine.new(config);

    // Fast I/O routes
    app.get("/health", |ctx| {
        ctx.json({"status": "ok"});
    });

    // Database operations (I/O-bound)
    app.get("/api/v1/users", |ctx| {
        let users = db.query("SELECT * FROM users LIMIT 100");
        try? ctx.json({"users": users});
    });

    // Heavy computation (CPU-bound)
    app.post("/api/v1/analytics", |ctx| {
        let data = try? ctx.bind_json::<AnalyticsRequest>();
        let result = process_analytics(data);  // CPU-intensive
        try? ctx.json(result);
    }).worker();

    try app.run(":8080");
}
```

### Architecture Decision Guide

**Choose Spawn-Only Mode if:**
- ✅ 90%+ of your routes are I/O-bound (database, API calls, file I/O)
- ✅ You want the simplest possible architecture
- ✅ Your CPU usage is typically < 30%
- ✅ You need to maximize concurrent connections

**Choose WorkerPool Mode if:**
- ✅ You have CPU-intensive routes (>100ms compute time)
- ✅ You're doing image/video processing
- ✅ You're running ML inference or data analysis
- ✅ Your CPU usage approaches 100% on critical routes

**Use Mixed Mode (Recommended) if:**
- ✅ You have both I/O and CPU-intensive routes
- ✅ You want optimal performance for all workloads
- ✅ You can identify and mark CPU-heavy routes with `.worker()`

See [BENCHMARK_RESULTS.md](BENCHMARK_RESULTS.md) for detailed performance analysis.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Navi Language](https://navi-lang.org) - The language that makes Sake possible
- [Gin](https://github.com/gin-gonic/gin) - The inspiration for Sake's API design
