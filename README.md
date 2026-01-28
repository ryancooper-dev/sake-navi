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

fn main() throws {
    let app = Engine.new();
    
    // Simple route
    app.get("/", |ctx| {
        ctx.string("Hello, Sake! 🍶");
    });
    
    // JSON response
    app.get("/api/users/:id", |ctx| {
        let id = ctx.param("id");
        ctx.json({
            "id": id,
            "name": "Navi User",
        });
    });
    
    // Start server
    try app.run(":8080");
}
```

## 📦 Installation

Add Sake to your `navi.toml`:

```toml
[dependencies]
sake = "0.1"
```

## 📖 Documentation

- [Getting Started](docs/getting-started.md)
- [Routing](docs/routing.md)
- [Middleware](docs/middleware.md)
- [Context API](docs/context.md)
- [Parallelism Guide](docs/parallelism.md)
- [API Reference](docs/api-reference.md)

## 🏗️ Architecture

Sake supports two execution modes:

### Default: `spawn` + `channel` (Single-thread Concurrency)

Best for I/O-bound workloads (most web applications):

```
Client → Server → spawn { handle_request() }
                → spawn { handle_request() }
                → spawn { handle_request() }
```

### Optional: `WorkerPool` (Multi-thread Parallelism)

Best for CPU-intensive routes:

```nv
app.get("/compute/:n", |ctx| {
    let result = heavy_computation(ctx.param("n"));
    ctx.json({"result": result});
}).worker();  // Enable WorkerPool for this route
```

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
