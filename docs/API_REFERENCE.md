# Sake API Reference

## Core Types

### Engine

Main application entry point.

```navi
pub struct Engine
```

#### Methods

##### `new() -> Engine`

Create a new Sake application.

```navi
let app = Engine.new();
```

##### `with_workers(count: int) -> Engine`

Create application with WorkerPool support.

```navi
let app = Engine.with_workers(4);
```

##### `get(pattern: string, handler: HandlerFunc) -> Route`

Register GET route.

```navi
app.get("/users", |ctx| {
    ctx.json({"users": []});
});
```

##### `post(pattern: string, handler: HandlerFunc) -> Route`

Register POST route.

##### `put(pattern: string, handler: HandlerFunc) -> Route`

Register PUT route.

##### `delete(pattern: string, handler: HandlerFunc) -> Route`

Register DELETE route.

##### `patch(pattern: string, handler: HandlerFunc) -> Route`

Register PATCH route.

##### `use(middleware: HandlerFunc)`

Add global middleware.

```navi
app.use(logger());
app.use(recovery());
```

##### `run(address: string) throws`

Start the HTTP server.

```navi
try app.run(":8080");
```

---

### Context

Request/response context passed to handlers.

```navi
pub struct Context
```

#### Request Methods

##### `method() -> string`

Get HTTP method (GET, POST, etc.).

##### `path() -> string`

Get request path.

##### `uri() -> string`

Get full URI with query string.

##### `param(name: string) -> string?`

Get path parameter.

```navi
// Route: /users/:id
let id = ctx.param("id");
```

##### `query(name: string) -> string?`

Get query parameter.

```navi
// URL: /search?q=sake
let query = ctx.query("q");
```

##### `header(name: string) -> string?`

Get request header.

##### `body() -> string`

Get request body.

##### `bind_json<T>() throws -> T`

Parse JSON body into type T.

```navi
struct User {
    name: string,
    email: string,
}

let user = try ctx.bind_json::<User>();
```

#### Response Methods

##### `status(code: int) -> Context`

Set response status code.

```navi
ctx.status(201);
```

##### `set_header(name: string, value: string) -> Context`

Set response header.

##### `json(data: any) throws`

Send JSON response.

```navi
ctx.json({"message": "OK"});
```

##### `string(content: string)`

Send plain text response.

##### `html(content: string)`

Send HTML response.

##### `data(content_type: string, data: string)`

Send raw data with content type.

##### `redirect(code: int, url: string)`

Redirect to URL.

```navi
ctx.redirect(302, "/login");
```

#### Middleware Methods

##### `next() throws`

Execute next handler in chain.

```navi
app.use(|ctx| {
    println("Before");
    try ctx.next();
    println("After");
});
```

##### `abort()`

Stop handler chain execution.

##### `abort_with_status(code: int)`

Abort with status code.

```navi
ctx.abort_with_status(401);
```

##### `abort_with_error(code: int, message: string)`

Abort with JSON error response.

```navi
ctx.abort_with_error(400, "Invalid input");
```

##### `is_aborted() -> bool`

Check if chain was aborted.

#### Data Storage

##### `set(key: string, value: any)`

Store value in context.

```navi
ctx.set("user_id", 123);
```

##### `get(key: string) -> any?`

Get value from context.

##### `get_string(key: string) -> string?`

Get string value.

##### `get_int(key: string) -> int?`

Get int value.

---

### Route

Route configuration.

```navi
pub struct Route
```

#### Methods

##### `worker() -> Route`

Mark route for WorkerPool execution.

```navi
app.get("/compute", handler).worker();
```

##### `use(middleware: HandlerFunc) -> Route`

Add route-specific middleware.

```navi
app.get("/protected", handler)
    .use(auth_middleware);
```

---

### Router

HTTP request router.

```navi
pub struct Router
```

#### Methods

##### `new() -> Router`

Create new router.

##### `add(method: string, pattern: string, handler: HandlerFunc) -> Route`

Add route.

##### `get(pattern: string, handler: HandlerFunc) -> Route`

Add GET route.

##### `post(pattern: string, handler: HandlerFunc) -> Route`

Add POST route.

##### `match(method: string, path: string) -> RouteMatch?`

Match request to route.

---

### WorkerPoolConfig

WorkerPool configuration (serializable).

```navi
pub struct WorkerPoolConfig
```

#### Methods

##### `new(size: int) -> WorkerPoolConfig`

Create configuration. Size 0 = auto-detect CPU count.

```navi
let config = WorkerPoolConfig.new(4);
```

##### `with_queue_size(size: int) -> WorkerPoolConfig`

Set task queue size.

```navi
config.with_queue_size(1000);
```

##### `with_timeout(seconds: int) -> WorkerPoolConfig`

Set task timeout in seconds.

```navi
config.with_timeout(30);
```

##### `with_load_balance(strategy: LoadBalanceStrategy) -> WorkerPoolConfig`

Set load balancing strategy.

```navi
config.with_load_balance(LoadBalanceStrategy.LeastLoaded);
```

##### `start() throws -> WorkerPoolRuntime`

Start runtime (creates channels and workers).

```navi
let runtime = try config.start();
```

---

### WorkerPoolRuntime

WorkerPool runtime (contains channels).

```navi
pub struct WorkerPoolRuntime
```

#### Methods

##### `submit(task_json: string) throws`

Submit task to pool.

```navi
let task = json.encode({"data": 42});
try runtime.submit(task);
```

##### `get_result() throws -> string`

Get next result (blocking).

```navi
let result = try runtime.get_result();
```

##### `get_result_timeout(seconds: int) throws -> string?`

Get result with timeout.

```navi
let result = try runtime.get_result_timeout(30);
if (result == nil) {
    // Timeout
}
```

##### `size() -> int`

Get number of workers.

##### `is_shutdown() -> bool`

Check if pool is shutting down.

##### `shutdown() throws`

Gracefully shutdown pool.

```navi
try runtime.shutdown();
```

---

### LoadBalanceStrategy

Load balancing strategy enum.

```navi
pub enum LoadBalanceStrategy {
    RoundRobin,
    LeastLoaded,
    Random,
}
```

---

## Middleware

### Built-in Middleware

#### `recovery() -> HandlerFunc`

Catches errors and prevents crashes.

```navi
use sake.middleware.recovery;

app.use(recovery());
```

#### `logger() -> HandlerFunc`

Logs requests with timing.

```navi
use sake.middleware.logger;

app.use(logger());
```

#### `logger_colored() -> HandlerFunc`

Colored logger output.

#### `cors_default() -> HandlerFunc`

CORS with default (permissive) settings.

```navi
use sake.middleware.cors;

app.use(cors_default());
```

#### `cors(config: CorsConfig) -> HandlerFunc`

CORS with custom configuration.

```navi
let config = CorsConfig.restrictive()
    .allow_origin("https://example.com")
    .with_credentials();

app.use(cors(config));
```

---

### CorsConfig

CORS configuration.

```navi
pub struct CorsConfig
```

#### Methods

##### `default() -> CorsConfig`

Permissive configuration (allows all).

##### `restrictive() -> CorsConfig`

Restrictive configuration.

##### `allow_origin(origin: string) -> CorsConfig`

Add allowed origin.

##### `allow_method(method: string) -> CorsConfig`

Add allowed method.

##### `with_credentials() -> CorsConfig`

Enable credentials.

---

## Request

HTTP request representation.

```navi
pub struct Request
```

### Methods

##### `parse(raw: string) throws -> Request`

Parse raw HTTP request.

```navi
let req = try Request.parse(http_string);
```

##### `header(name: string) -> string?`

Get header value.

##### `query(name: string) -> string?`

Get query parameter.

##### `content_type() -> string?`

Get Content-Type header.

##### `content_length() -> int?`

Get Content-Length as integer.

##### `is_get() -> bool`

Check if GET request.

##### `is_post() -> bool`

Check if POST request.

##### `accepts_json() -> bool`

Check if accepts JSON response.

---

## Response

HTTP response builder.

```navi
pub struct Response
```

### Methods

##### `new() -> Response`

Create new response.

##### `status(code: int) -> Response`

Set status code.

##### `header(name: string, value: string) -> Response`

Set header.

##### `content_type(mime: string) -> Response`

Set Content-Type.

##### `write(content: string)`

Write to body.

##### `build() -> string`

Build complete HTTP response string.

### Static Methods

##### `json_ok(data: string) -> Response`

200 OK with JSON.

##### `created(data: string) -> Response`

201 Created.

##### `no_content() -> Response`

204 No Content.

##### `bad_request(message: string) -> Response`

400 Bad Request.

##### `unauthorized() -> Response`

401 Unauthorized.

##### `not_found() -> Response`

404 Not Found.

##### `internal_error(message: string) -> Response`

500 Internal Server Error.

---

## Type Aliases

### HandlerFunc

Handler function type.

```navi
pub type HandlerFunc = |(ctx: Context) throws|;
```

All handlers and middleware use this signature.

---

## Examples

### Basic Server

```navi
use sake.Engine;

fn main() throws {
    let app = Engine.new();

    app.get("/", |ctx| {
        ctx.json({"message": "Hello!"});
    });

    try app.run(":8080");
}
```

### With WorkerPool

```navi
use sake.Engine;

fn main() throws {
    let app = Engine.with_workers(4);

    app.get("/compute/:n", |ctx| {
        let n = ctx.param("n") || "0";
        let result = fibonacci(n);
        ctx.json({"result": result});
    }).worker();

    try app.run(":8080");
}
```

### With Middleware

```navi
use sake.Engine;
use sake.middleware.{recovery, logger, cors_default};

fn main() throws {
    let app = Engine.new();

    app.use(recovery());
    app.use(logger());
    app.use(cors_default());

    app.get("/", |ctx| {
        ctx.string("OK");
    });

    try app.run(":8080");
}
```

### Route Middleware

```navi
let auth = |ctx: Context| {
    let token = ctx.header("Authorization");
    if (token == nil) {
        ctx.abort_with_status(401);
        return;
    }
    try ctx.next();
};

app.get("/protected", |ctx| {
    ctx.string("Secret data");
}).use(auth);
```

### Custom Configuration

```navi
use sake.Engine;
use worker_pool.{WorkerPoolConfig, LoadBalanceStrategy};

fn main() throws {
    let pool_config = WorkerPoolConfig.new(8)
        .with_timeout(60)
        .with_queue_size(2000)
        .with_load_balance(LoadBalanceStrategy.LeastLoaded);

    let app = Engine.new()
        .set_worker_pool(pool_config);

    try app.run(":8080");
}
```
