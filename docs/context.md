# Context API

The Context object is passed to every handler and provides access to request data and response methods.

## Request Data

### Path and Method

```nv
app.get("/api/users/:id", func_handler(|ctx| {
    let method = ctx.method();     // "GET"
    let path = ctx.path();         // "/api/users/123"
    let uri = ctx.uri();           // "/api/users/123?page=1"
}));
```

### Path Parameters

```nv
app.get("/users/:userId/posts/:postId", func_handler(|ctx| {
    // Returns string? (optional)
    let user_id = ctx.param("userId");
    let post_id = ctx.param("postId");

    if (let uid = user_id) {
        println(`User ID: ${uid}`);
    }
}));
```

### Query Parameters

```nv
app.get("/search", func_handler(|ctx| {
    // GET /search?q=navi&page=2&limit=10

    // Optional access
    let q = ctx.query("q");           // string?
    let page = ctx.query("page");     // string?

    // With default value
    let limit = ctx.default_query("limit", "20");  // string

    // Parse to int
    let page_num = ctx.query("page")?.parse::<int>() ?? 1;
}));
```

### Headers

```nv
app.get("/", func_handler(|ctx| {
    // Headers are case-insensitive
    let content_type = ctx.header("content-type");
    let auth = ctx.header("Authorization");
    let custom = ctx.header("x-custom-header");

    // Content-Type shortcut
    let ct = ctx.content_type();
}));
```

### Request Body

```nv
app.post("/users", func_handler(|ctx| {
    // Raw body
    let body = ctx.body();  // string

    // Parse JSON
    struct CreateUser {
        name: string,
        email: string,
    }

    let user = try? ctx.bind_json::<CreateUser>();
    if (let u = user) {
        println(`Creating user: ${u.name}`);
    }
}));
```

## Response Methods

### String Response

```nv
app.get("/text", func_handler(|ctx| {
    ctx.string("Hello, World!");
    // Content-Type: text/plain
}));
```

### JSON Response

```nv
app.get("/json", func_handler(|ctx| {
    try? ctx.json({
        "message": "Hello",
        "count": 42,
        "items": ["a", "b", "c"],
    });
    // Content-Type: application/json
}));
```

### HTML Response

```nv
app.get("/html", func_handler(|ctx| {
    ctx.html("<h1>Hello, World!</h1>");
    // Content-Type: text/html
}));
```

### XML Response

```nv
app.get("/xml", func_handler(|ctx| {
    ctx.xml("<user><name>Alice</name></user>");
    // Content-Type: application/xml
}));
```

### YAML Response

```nv
app.get("/yaml", func_handler(|ctx| {
    ctx.yaml("name: Alice\nage: 30\n");
    // Content-Type: application/yaml
}));
```

### Custom Content Type

```nv
app.get("/custom", func_handler(|ctx| {
    ctx.data("application/octet-stream", binary_data);
}));
```

### Status Code

```nv
app.get("/status", func_handler(|ctx| {
    ctx.status(201);
    try? ctx.json({"created": true});
}));

app.get("/not-found", func_handler(|ctx| {
    ctx.status(404);
    ctx.string("Resource not found");
}));
```

### Set Headers

```nv
app.get("/", func_handler(|ctx| {
    ctx.set_header("X-Custom-Header", "value");
    ctx.set_header("Cache-Control", "no-cache");
    ctx.string("OK");
}));
```

### Redirect

```nv
app.get("/old-path", func_handler(|ctx| {
    ctx.redirect(301, "/new-path");  // Permanent redirect
}));

app.get("/temp-redirect", func_handler(|ctx| {
    ctx.redirect(302, "/other");     // Temporary redirect
}));
```

## Middleware Control

### Next Handler

```nv
fn my_middleware(): Handler {
    return func_handler(|ctx| {
        println("Before handler");
        try ctx.next();  // Execute next middleware/handler
        println("After handler");
    });
}
```

### Abort Chain

```nv
fn auth_check(): Handler {
    return func_handler(|ctx| {
        if (!is_authenticated(ctx)) {
            ctx.abort();  // Stop the chain
            return;
        }
        try ctx.next();
    });
}

// With status code
fn auth_check(): Handler {
    return func_handler(|ctx| {
        if (!is_authenticated(ctx)) {
            ctx.abort_with_status(401);
            return;
        }
        try ctx.next();
    });
}

// With JSON error
fn auth_check(): Handler {
    return func_handler(|ctx| {
        if (!is_authenticated(ctx)) {
            ctx.abort_with_error(401, "Unauthorized");
            return;
        }
        try ctx.next();
    });
}
```

### Check if Aborted

```nv
fn my_middleware(): Handler {
    return func_handler(|ctx| {
        try ctx.next();

        if (ctx.is_aborted()) {
            println("Request was aborted");
        }
    });
}
```

## Context Data Storage

Share data between middleware and handlers:

### Set and Get

```nv
// Set any value
ctx.set("user_id", 123);
ctx.set("is_admin", true);
ctx.set("username", "alice");

// Get value (returns any?)
let value = ctx.get("user_id");
```

### Typed Getters

```nv
// Get as specific type
let name = ctx.get_string("username");   // string?
let id = ctx.get_int("user_id");         // int?
let admin = ctx.get_bool("is_admin");    // bool?
let score = ctx.get_float("score");      // float?
```

### Example Usage

```nv
// In middleware
fn user_loader(): Handler {
    return func_handler(|ctx| {
        let user_id = parse_token(ctx.header("authorization"));
        ctx.set("user_id", user_id);
        ctx.set("is_admin", check_admin(user_id));
        try ctx.next();
    });
}

// In handler
app.get("/profile", func_handler(|ctx| {
    let user_id = ctx.get_string("user_id") ?? "0";
    let is_admin = ctx.get_bool("is_admin") ?? false;

    try? ctx.json({
        "user_id": user_id,
        "is_admin": is_admin,
    });
}));
```

## Worker Pool Context

Check if running in worker pool:

```nv
app.get("/compute", func_handler(|ctx| {
    if (ctx.in_worker_pool()) {
        println("Running in parallel worker");
    }

    let pool_size = ctx.worker_pool_size();
    println(`Pool has ${pool_size} workers`);
})).worker();
```

## Full Example

```nv
use sake.{Engine, func_handler};

fn main() throws {
    let app = Engine.with_defaults();

    app.post("/api/users", func_handler(|ctx| {
        // Validate content type
        let ct = ctx.content_type() ?? "";
        if (!ct.contains("application/json")) {
            ctx.status(415);
            try? ctx.json({"error": "Content-Type must be application/json"});
            return;
        }

        // Parse body
        struct CreateUserRequest {
            name: string,
            email: string,
        }

        let request = try? ctx.bind_json::<CreateUserRequest>();
        if (request == nil) {
            ctx.status(400);
            try? ctx.json({"error": "Invalid request body"});
            return;
        }

        if (let req = request) {
            // Create user...
            let user_id = 123;

            ctx.status(201);
            ctx.set_header("Location", `/api/users/${user_id}`);
            try? ctx.json({
                "id": user_id,
                "name": req.name,
                "email": req.email,
            });
        }
    }));

    try app.run(":8080");
}
```
