# Middleware

Middleware intercepts requests before and after handlers.

## Basic Middleware

```nv
app.add_middleware(|ctx| {
    println("Before request");
    try ctx.next();
    println("After request");
});
```

## Calling Next

Always call `ctx.next()` to continue the chain:

```nv
app.add_middleware(|ctx| {
    // Pre-processing
    let start = time.now();

    try ctx.next();  // Continue to next handler

    // Post-processing
    let duration = time.now() - start;
    println(`Request took ${duration}ms`);
});
```

## Early Return

Skip remaining handlers by not calling `next()`:

```nv
fn auth_middleware(ctx: Context) throws {
    let token = ctx.header("Authorization");

    if (token == nil) {
        ctx.status(401);
        ctx.string("Unauthorized");
        return;  // Don't call next()
    }

    try ctx.next();
}
```

## Middleware Order

Middleware executes in registration order:

```nv
app.add_middleware(logger);    // 1st
app.add_middleware(auth);      // 2nd
app.add_middleware(compress);  // 3rd
```

Request flow:
```
→ logger → auth → compress → handler
← logger ← auth ← compress ←
```

## Route-Specific Middleware

Add middleware to individual routes:

```nv
app.get("/admin", admin_handler)
    .add_middleware(auth_middleware);
```

## Group Middleware

Apply to all routes in a group:

```nv
let api = app.group("/api");
api.add_middleware(cors_middleware);
api.add_middleware(rate_limit);
```

## Common Patterns

### Logger

```nv
fn logger(ctx: Context) throws {
    let method = ctx.request.method;
    let path = ctx.request.path;
    println(`${method} ${path}`);
    try ctx.next();
}
```

### CORS

```nv
fn cors(ctx: Context) throws {
    ctx.header("Access-Control-Allow-Origin", "*");
    ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");

    if (ctx.request.method == "OPTIONS") {
        ctx.status(204);
        return;
    }

    try ctx.next();
}
```

### Recovery

```nv
fn recovery(ctx: Context) throws {
    do {
        try ctx.next();
    } catch (e) {
        ctx.status(500);
        ctx.json({"error": "Internal Server Error"});
    }
}
```
