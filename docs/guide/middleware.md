# Middleware

Middleware intercepts requests before and after handlers.

## Basic Middleware

```nv
app.add_middleware(func_handler(|ctx| {
    println("Before request");
    try ctx.next();
    println("After request");
}));
```

## Calling Next

Always call `ctx.next()` to continue the chain:

```nv
app.add_middleware(func_handler(|ctx| {
    // Pre-processing
    let start = time.now();

    try ctx.next();  // Continue to next handler

    // Post-processing
    let duration = time.now() - start;
    println(`Request took ${duration}ms`);
}));
```

## Early Return

Skip remaining handlers by not calling `next()`:

```nv
let auth_middleware = func_handler(|ctx| {
    let token = ctx.header("Authorization");

    if (token == nil) {
        ctx.status(401);
        ctx.string("Unauthorized");
        return;  // Don't call next()
    }

    try ctx.next();
});
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
let logger = func_handler(|ctx| {
    let method = ctx.method();
    let path = ctx.path();
    println(`${method} ${path}`);
    try ctx.next();
});
```

### CORS

```nv
let cors = func_handler(|ctx| {
    ctx.set_header("Access-Control-Allow-Origin", "*");
    ctx.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");

    if (ctx.method() == "OPTIONS") {
        ctx.status(204);
        return;
    }

    try ctx.next();
});
```

### Recovery

```nv
let recovery = func_handler(|ctx| {
    do {
        try ctx.next();
    } catch (e) {
        ctx.status(500);
        try? ctx.json({"error": "Internal Server Error"});
    }
});
```
