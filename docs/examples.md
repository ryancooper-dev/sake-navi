# Examples

## Hello World

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.default();

    app.get("/", |ctx| {
        ctx.string("Hello, Sake.");
    });

    try app.run(":8080");
}
```

## JSON API

```nv
use sake.Engine;

struct User {
    id: int,
    name: string,
    email: string,
}

fn main() throws {
    let app = Engine.default();

    app.get("/api/users/:id", |ctx| {
        let id = ctx.param("id")?.parse::<int>() ?? 0;

        try? ctx.json(User {
            id: id,
            name: "Navi User",
            email: "user@example.com",
        });
    });

    try app.run(":8080");
}
```

## Middleware

```nv
use sake.{Engine, Context};

fn logger(ctx: Context) throws {
    let method = ctx.request.method;
    let path = ctx.request.path;
    println(`→ ${method} ${path}`);

    try ctx.next();

    println(`← ${ctx.response.status_code}`);
}

fn main() throws {
    let app = Engine.default();

    app.add_middleware(logger);

    app.get("/", |ctx| {
        ctx.string("Hello");
    });

    try app.run(":8080");
}
```

## Route Groups

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.default();

    let api = app.group("/api");

    let v1 = api.group("/v1");
    v1.get("/users", |ctx| {
        try? ctx.json({"version": "v1", "users": []});
    });

    let v2 = api.group("/v2");
    v2.get("/users", |ctx| {
        try? ctx.json({"version": "v2", "users": [], "total": 0});
    });

    try app.run(":8080");
}
```

## CPU-Intensive Route

```nv
use sake.{Engine, Config};

fn fibonacci(n: int): int {
    if (n <= 1) { return n; }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

fn main() throws {
    let config = Config.default()
        .with_worker_pool(true)
        .with_worker_pool_size(4);

    let app = Engine.new(config);

    // CPU-intensive: use WorkerPool
    app.get("/fib/:n", |ctx| {
        let n = ctx.param("n")?.parse::<int>() ?? 10;
        let result = fibonacci(n);
        try? ctx.json({"n": n, "result": result});
    }).worker();

    // I/O-bound: use default spawn
    app.get("/health", |ctx| {
        try? ctx.json({"status": "ok"});
    });

    try app.run(":8080");
}
```

## Static Files

```nv
use sake.Engine;
use std.fs;

fn main() throws {
    let app = Engine.default();

    app.get("/static/*filepath", |ctx| {
        let path = ctx.param("filepath") ?? "index.html";
        let full_path = `./public/${path}`;

        if (let content = try? fs.read_file(full_path)) {
            let mime = guess_mime(path);
            ctx.header("Content-Type", mime);
            ctx.data(mime, content);
        } else {
            ctx.status(404);
            ctx.string("Not Found");
        }
    });

    try app.run(":8080");
}

fn guess_mime(path: string): string {
    if (path.ends_with(".html")) { return "text/html"; }
    if (path.ends_with(".css")) { return "text/css"; }
    if (path.ends_with(".js")) { return "application/javascript"; }
    if (path.ends_with(".json")) { return "application/json"; }
    if (path.ends_with(".png")) { return "image/png"; }
    if (path.ends_with(".jpg")) { return "image/jpeg"; }
    return "application/octet-stream";
}
```

## Authentication

```nv
use sake.{Engine, Context};

fn auth_middleware(ctx: Context) throws {
    let auth = ctx.header("Authorization");

    if (auth == nil) {
        ctx.status(401);
        try ctx.json({"error": "Unauthorized"});
        return;
    }

    let token = auth!;
    if (!token.starts_with("Bearer ")) {
        ctx.status(401);
        try ctx.json({"error": "Invalid token format"});
        return;
    }

    // Validate token...
    try ctx.next();
}

fn main() throws {
    let app = Engine.default();

    // Public routes
    app.get("/", |ctx| {
        ctx.string("Welcome");
    });

    // Protected routes
    let api = app.group("/api");
    api.add_middleware(auth_middleware);

    api.get("/profile", |ctx| {
        try? ctx.json({"user": "authenticated"});
    });

    try app.run(":8080");
}
```
