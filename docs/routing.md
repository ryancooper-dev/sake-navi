# Routing

Sake provides a flexible and intuitive routing system inspired by Gin.

## Basic Routes

```nv
use sake.{Engine, func_handler};

fn main() throws {
    let app = Engine.with_defaults();

    // HTTP methods
    app.get("/get", func_handler(|ctx| { ctx.string("GET"); }));
    app.post("/post", func_handler(|ctx| { ctx.string("POST"); }));
    app.put("/put", func_handler(|ctx| { ctx.string("PUT"); }));
    app.delete("/delete", func_handler(|ctx| { ctx.string("DELETE"); }));
    app.patch("/patch", func_handler(|ctx| { ctx.string("PATCH"); }));
    app.options("/options", func_handler(|ctx| { ctx.string("OPTIONS"); }));
    app.head("/head", func_handler(|ctx| { ctx.string("HEAD"); }));

    // Match any method
    app.any("/any", func_handler(|ctx| {
        ctx.string(`Method: ${ctx.method()}`);
    }));

    try app.run(":8080");
}
```

## Path Parameters

Capture dynamic path segments with `:param`:

```nv
// Single parameter
app.get("/users/:id", func_handler(|ctx| {
    let id = ctx.param("id");  // Returns string?
    if (let user_id = id) {
        try? ctx.json({"user_id": user_id});
    }
}));

// Multiple parameters
app.get("/users/:userId/posts/:postId", func_handler(|ctx| {
    let user_id = ctx.param("userId") ?? "unknown";
    let post_id = ctx.param("postId") ?? "unknown";
    try? ctx.json({
        "user_id": user_id,
        "post_id": post_id,
    });
}));

// Parameters with extensions
app.get("/files/:filename", func_handler(|ctx| {
    let filename = ctx.param("filename");
    // Matches: /files/report.pdf, /files/image.png
}));
```

## Wildcard Routes

Capture remaining path with `*param`:

```nv
// Static file serving
app.get("/static/*filepath", func_handler(|ctx| {
    let filepath = ctx.param("filepath");
    // Matches: /static/css/style.css → filepath = "css/style.css"
    // Matches: /static/js/app.js → filepath = "js/app.js"
}));

// API proxy
app.any("/proxy/*path", func_handler(|ctx| {
    let path = ctx.param("path");
    // Forward to upstream
}));
```

## Route Groups

Organize routes with common prefixes and middleware:

```nv
use sake.{Engine, func_handler};

fn main() throws {
    let app = Engine.with_defaults();

    // Basic group
    let api = app.group("/api");
    api.get("/users", func_handler(|ctx| { /* ... */ }));
    api.get("/posts", func_handler(|ctx| { /* ... */ }));

    // Nested groups
    let v1 = api.group("/v1");
    v1.get("/users", func_handler(|ctx| { /* /api/v1/users */ }));

    let v2 = api.group("/v2");
    v2.get("/users", func_handler(|ctx| { /* /api/v2/users */ }));

    // Group with middleware
    let admin = app.group("/admin");
    admin.add_middleware(auth_middleware());
    admin.get("/dashboard", func_handler(|ctx| { /* ... */ }));
    admin.get("/settings", func_handler(|ctx| { /* ... */ }));

    try app.run(":8080");
}
```

## Route-Level Middleware

Apply middleware to specific routes:

```nv
// Single middleware
app.get("/protected", func_handler(|ctx| {
    ctx.string("Protected content");
})).add_middleware(auth_middleware());

// Multiple middleware
app.get("/admin", func_handler(|ctx| {
    ctx.string("Admin only");
}))
.add_middleware(auth_middleware())
.add_middleware(admin_middleware());
```

## Worker Mode

Mark CPU-intensive routes to use the WorkerPool:

```nv
use sake.{Engine, Config, func_handler};

fn main() throws {
    let config = Config.with_defaults()
        .with_worker_pool_size(4);

    let app = Engine.new(config);

    // I/O-bound route (default spawn mode)
    app.get("/api/users", func_handler(|ctx| {
        // Database queries, HTTP calls, etc.
    }));

    // CPU-intensive route (worker pool)
    app.get("/compute/:n", func_handler(|ctx| {
        let n = ctx.param("n")?.parse::<int>() ?? 10;
        let result = fibonacci(n);
        try? ctx.json({"result": result});
    })).worker();  // ← Executes in parallel worker threads

    try app.run(":8080");
}
```

## Route Priority

Routes are matched in registration order:

```nv
// More specific routes should be registered first
app.get("/users/admin", func_handler(|ctx| {
    // Matches: /users/admin
}));

app.get("/users/:id", func_handler(|ctx| {
    // Matches: /users/123, /users/john (but not /users/admin)
}));

app.get("/files/*path", func_handler(|ctx| {
    // Catches remaining paths
}));
```

## Query Parameters

Access query string parameters:

```nv
app.get("/search", func_handler(|ctx| {
    // GET /search?q=navi&page=2

    // Optional access
    let query = ctx.query("q");  // Returns string?

    // With default value
    let page = ctx.default_query("page", "1");
    let limit = ctx.default_query("limit", "10");

    try? ctx.json({
        "query": query ?? "",
        "page": page,
        "limit": limit,
    });
}));
```

## Best Practices

1. **Group related routes** - Use route groups to organize your API
2. **Order matters** - Register specific routes before parameterized ones
3. **Use middleware wisely** - Apply auth at group level, logging globally
4. **Mark CPU-intensive routes** - Use `.worker()` for computational tasks
5. **Keep handlers small** - Extract business logic to separate functions
