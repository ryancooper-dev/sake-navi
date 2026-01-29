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
- **Type-Safe** - Full Navi type safety with Optional types and error handling

## 🚀 Quick Start

```nv
use sake.Engine;
use sake.middleware.{recovery, logger};

fn main() throws {
    let app = Engine.new();

    // Add middleware
    app.use(recovery());
    app.use(logger());

    // Simple route
    app.get("/", |ctx| {
        ctx.string("Hello, Sake! 🍶");
    });

    // JSON response with path parameters
    app.get("/api/users/:id", |ctx| {
        let id = ctx.param("id");
        ctx.json({
            "id": id,
            "name": "Navi User",
        });
    });

    // CPU-intensive route with WorkerPool
    app.get("/compute/:n", |ctx| {
        let n = ctx.param("n") || "10";
        let result = fibonacci(n);
        ctx.json({"result": result});
    }).worker();  // Use WorkerPool for parallel processing

    // Start server
    try app.run(":8080");
}

fn fibonacci(n: int): int {
    if (n <= 1) { return n; }
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

## 📦 Installation

Add Sake to your `navi.toml`:

```toml
[dependencies]
sake = "0.1"
```

## 📖 Documentation

- [API Reference](docs/API_REFERENCE.md) - Complete API documentation
- [WorkerPool Guide](docs/WORKER_POOL_GUIDE.md) - In-depth guide to parallel processing
- [Parallelism Spec](specs/parallelism-spec.md) - Technical specification and benchmarks
- [Analysis](WORKERPOOL_ANALYSIS.md) - Design decisions and trade-offs

## 🏗️ Architecture

Sake supports two execution modes with seamless integration:

### Default: `spawn` + `channel` (Single-thread Concurrency)

Best for I/O-bound workloads (most web applications):

```
Client → Server → spawn { handle_request() }
                → spawn { handle_request() }
                → spawn { handle_request() }
```

- Zero overhead
- Perfect for database queries, API calls, file I/O
- Handles thousands of concurrent connections
- Default mode for all routes

### Optional: `WorkerPool` (Multi-thread Parallelism)

Best for CPU-intensive routes:

```nv
// Configure WorkerPool (stored as config, not runtime)
let app = Engine.with_workers(4);  // 4 worker threads

// Mark CPU-intensive routes with .worker()
app.get("/compute/:n", |ctx| {
    let result = heavy_computation(ctx.param("n"));
    ctx.json({"result": result});
}).worker();  // This route uses WorkerPool

// Normal routes still use spawn
app.get("/api/data", |ctx| {
    let data = fetch_from_db();
    ctx.json(data);
});  // This route uses spawn
```

**Key Features:**
- Config/Runtime separation pattern (no channel serialization issues)
- Automatic load balancing (Round-robin, Least-loaded, Random)
- Configurable timeouts
- Graceful shutdown
- 5-7x speedup for CPU-intensive tasks

**Performance:**
| Task Type | Sequential | WorkerPool (4 cores) | Speedup |
|-----------|-----------|----------------------|---------|
| Light (<10ms) | 4.8ms | 15.9ms | 0.3x (overhead) |
| Heavy (>100ms) | 4200ms | 850ms | 5x |

See [WorkerPool Guide](docs/WORKER_POOL_GUIDE.md) for detailed usage.

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
