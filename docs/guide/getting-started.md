# Getting Started

Sake is a lightweight web framework for [Navi](https://navi-lang.org). It provides a clean, Gin-inspired API for building HTTP servers.

## Quick Start

```nv
use sake.{Engine, func_handler};

fn main() throws {
    let app = Engine.with_defaults();

    app.get("/", func_handler(|ctx| {
        ctx.string("Hello, Sake.");
    }));

    try app.run(":8080");
}
```

Run your server:

```bash
navi run main.nv
```

Visit `http://localhost:8080` to see your server in action.

## Routes

Define routes using HTTP method helpers:

```nv
app.get("/users", handler);      // GET
app.post("/users", handler);     // POST
app.put("/users/:id", handler);  // PUT
app.delete("/users/:id", handler); // DELETE
```

## Path Parameters

Capture dynamic segments with `:param` syntax:

```nv
app.get("/users/:id", func_handler(|ctx| {
    let id = ctx.param("id");
    try? ctx.json({"user_id": id});
}));
```

## JSON Responses

Return JSON with type inference:

```nv
app.get("/api/status", func_handler(|ctx| {
    try? ctx.json({
        "status": "ok",
        "version": "1.0.0"
    });
}));
```

## Query Parameters

Access query strings:

```nv
// GET /search?q=navi&limit=10
app.get("/search", func_handler(|ctx| {
    let query = ctx.query("q") ?? "";
    let limit = ctx.query("limit") ?? "10";
    // ...
}));
```

## Next Steps

- [Routing](/guide/routing) — Route groups, wildcards, and more
- [Middleware](/guide/middleware) — Request/response middleware
- [Context](/guide/context) — Full context API
- [Parallelism](/guide/parallelism) — spawn vs WorkerPool
