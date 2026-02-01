# Engine

The core application instance.

## Constructor

### `Engine.default()`

Create with default configuration.

```nv
let app = Engine.default();
```

### `Engine.new(config: Config)`

Create with custom configuration.

```nv
let config = Config.default()
    .with_worker_pool_size(4);

let app = Engine.new(config);
```

## Route Methods

### `get(path, handler)`

Register a GET route.

```nv
app.get("/users", |ctx| {
    try? ctx.json({"users": []});
});
```

### `post(path, handler)`

Register a POST route.

```nv
app.post("/users", |ctx| {
    let user = try ctx.bind_json::<User>();
    // ...
});
```

### `put(path, handler)`

Register a PUT route.

### `delete(path, handler)`

Register a DELETE route.

### `patch(path, handler)`

Register a PATCH route.

### `options(path, handler)`

Register an OPTIONS route.

### `head(path, handler)`

Register a HEAD route.

### `any(path, handler)`

Register a route for all HTTP methods.

```nv
app.any("/ping", |ctx| {
    ctx.string("pong");
});
```

## Middleware

### `add_middleware(handler)`

Add global middleware.

```nv
app.add_middleware(|ctx| {
    println("Request received");
    try ctx.next();
});
```

## Groups

### `group(prefix)`

Create a route group with a common prefix.

```nv
let api = app.group("/api");
api.get("/users", handler);  // GET /api/users
```

## Server

### `run(addr)`

Start the HTTP server.

```nv
try app.run(":8080");
try app.run("127.0.0.1:3000");
try app.run("0.0.0.0:80");
```

### `shutdown()`

Gracefully stop the server.

```nv
try app.shutdown();
```
