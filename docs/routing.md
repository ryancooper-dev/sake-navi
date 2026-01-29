# Routing

Sake provides a flexible and intuitive routing system inspired by Gin.

## Basic Routes

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.default();

    // HTTP methods
    app.get("/get", |ctx| { ctx.string("GET"); });
    app.post("/post", |ctx| { ctx.string("POST"); });
    app.put("/put", |ctx| { ctx.string("PUT"); });
    app.delete("/delete", |ctx| { ctx.string("DELETE"); });
    app.patch("/patch", |ctx| { ctx.string("PATCH"); });
    app.options("/options", |ctx| { ctx.string("OPTIONS"); });
    app.head("/head", |ctx| { ctx.string("HEAD"); });

    // Match any method
    app.any("/any", |ctx| {
        ctx.string(`Method: ${ctx.method()}`);
    });

    try app.run(":8080");
}
```

## Path Parameters

Capture dynamic path segments with `:param`:

```nv
// Single parameter
app.get("/users/:id", |ctx| {
    let id = ctx.param("id");  // Returns string?
    if (let user_id = id) {
        try? ctx.json({"user_id": user_id});
    }
});

// Multiple parameters
app.get("/users/:userId/posts/:postId", |ctx| {
    let user_id = ctx.param("userId") || "unknown";
    let post_id = ctx.param("postId") || "unknown";
    try? ctx.json({
        "user_id": user_id,
        "post_id": post_id,
    });
});

// Parameters with extensions
app.get("/files/:filename", |ctx| {
    let filename = ctx.param("filename");
    // Matches: /files/report.pdf, /files/image.png
});
```

## Wildcard Routes

Capture remaining path with `*param`:

```nv
// Static file serving
app.get("/static/*filepath", |ctx| {
    let filepath = ctx.param("filepath");
    // Matches: /static/css/style.css → filepath = "css/style.css"
    // Matches: /static/js/app.js → filepath = "js/app.js"
});

// API proxy
app.any("/proxy/*path", |ctx| {
    let path = ctx.param("path");
    // Forward to upstream
});
```

## Route Groups

Organize routes with common prefixes and middleware:

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.default();

    // Basic group
    let api = app.group("/api");
    api.get("/users", |ctx| { /* ... */ });
    api.get("/posts", |ctx| { /* ... */ });

    // Nested groups
    let v1 = api.group("/v1");
    v1.get("/users", |ctx| { /* /api/v1/users */ });

    let v2 = api.group("/v2");
    v2.get("/users", |ctx| { /* /api/v2/users */ });

    // Group with middleware
    let admin = app.group("/admin");
    admin.use(auth_middleware());
    admin.get("/dashboard", |ctx| { /* ... */ });
    admin.get("/settings", |ctx| { /* ... */ });

    try app.run(":8080");
}
```

## Route-Level Middleware

Apply middleware to specific routes:

```nv
// Single middleware
app.get("/protected", |ctx| {
    ctx.string("Protected content");
}).use(auth_middleware());

// Multiple middleware
app.get("/admin", |ctx| {
    ctx.string("Admin only");
})
.use(auth_middleware())
.use(admin_middleware());
```

## Worker Mode

Mark CPU-intensive routes to use the WorkerPool:

```nv
use sake.{Engine, Config};

fn main() throws {
    let config = Config.with_defaults()
        .with_worker_pool_size(4);

    let app = Engine.new(config);

    // I/O-bound route (default spawn mode)
    app.get("/api/users", |ctx| {
        // Database queries, HTTP calls, etc.
    });

    // CPU-intensive route (worker pool)
    app.get("/compute/:n", |ctx| {
        let n = try? ctx.param("n")?.parse::<int>() || 10;
        let result = fibonacci(n);
        try? ctx.json({"result": result});
    }).worker();  // ← Executes in parallel worker threads

    try app.run(":8080");
}
```

## Route Priority

Routes are matched in registration order:

```nv
// More specific routes should be registered first
app.get("/users/admin", |ctx| {
    // Matches: /users/admin
});

app.get("/users/:id", |ctx| {
    // Matches: /users/123, /users/john (but not /users/admin)
});

app.get("/files/*path", |ctx| {
    // Catches remaining paths
});
```

## Query Parameters

Access query string parameters:

```nv
app.get("/search", |ctx| {
    // GET /search?q=navi&page=2

    // Optional access
    let query = ctx.query("q");  // Returns string?

    // With default value
    let page = ctx.default_query("page", "1");
    let limit = ctx.default_query("limit", "10");

    try? ctx.json({
        "query": query || "",
        "page": page,
        "limit": limit,
    });
});
```

## Best Practices

1. **Group related routes** - Use route groups to organize your API
2. **Order matters** - Register specific routes before parameterized ones
3. **Use middleware wisely** - Apply auth at group level, logging globally
4. **Mark CPU-intensive routes** - Use `.worker()` for computational tasks
5. **Keep handlers small** - Extract business logic to separate functions
