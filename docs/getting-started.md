# Getting Started with Sake

This guide will help you get started with Sake, a lightweight web framework for Navi.

## Prerequisites

- [Navi](https://navi-lang.org) 0.16+ installed
- Basic familiarity with Navi syntax

## Installation

Add Sake to your `navi.toml`:

```toml
[dependencies]
sake = "0.1"
```

## Your First Sake Application

Create a new file `main.nv`:

```nv
use sake.Engine;

fn main() throws {
    // Create a new Sake application
    let app = Engine.default();

    // Define a route
    app.get("/", |ctx| {
        ctx.string("Hello, Sake! 🍶");
    });

    // Start the server
    try app.run(":8080");
}
```

Run your application:

```bash
navi run main.nv
```

Visit `http://localhost:8080` in your browser!

## Adding More Routes

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.default();

    // GET request
    app.get("/", |ctx| {
        ctx.string("Home page");
    });

    // POST request
    app.post("/users", |ctx| {
        let body = ctx.body();
        try? ctx.json({"message": "User created", "data": body});
    });

    // Path parameters
    app.get("/users/:id", |ctx| {
        let id = ctx.param("id");
        try? ctx.json({"user_id": id});
    });

    // Query parameters
    app.get("/search", |ctx| {
        let q = ctx.default_query("q", "");
        let page = ctx.default_query("page", "1");
        try? ctx.json({"query": q, "page": page});
    });

    try app.run(":8080");
}
```

## Using Middleware

```nv
use sake.{Engine, Context};
use sake.middleware.logger.logger;
use sake.middleware.recovery.recovery;

fn main() throws {
    let app = Engine.default();

    // Add global middleware
    app.use(logger());
    app.use(recovery());

    app.get("/", |ctx| {
        ctx.string("Hello with middleware!");
    });

    try app.run(":8080");
}
```

## Route Groups

Organize routes with common prefixes:

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.default();

    // API v1 group
    let v1 = app.group("/api/v1");
    v1.get("/users", |ctx| {
        try? ctx.json({"users": []});
    });
    v1.get("/posts", |ctx| {
        try? ctx.json({"posts": []});
    });

    // API v2 group
    let v2 = app.group("/api/v2");
    v2.get("/users", |ctx| {
        try? ctx.json({"users": [], "version": 2});
    });

    try app.run(":8080");
}
```

## Next Steps

- [Routing Guide](routing.md) - Learn about routing patterns
- [Middleware Guide](middleware.md) - Built-in and custom middleware
- [Context API](context.md) - Request/response handling
- [Parallelism Guide](parallelism.md) - WorkerPool for CPU-intensive tasks
- [API Reference](api-reference.md) - Complete API documentation
