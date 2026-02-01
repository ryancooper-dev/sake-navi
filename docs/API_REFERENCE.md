# Sake API Reference

## Core Types

### Engine

Main application entry point.

```nv
pub struct Engine
```

#### Methods

##### `new(config: Config) -> Engine`

Create a new Sake application with configuration.

```nv
let config = Config.with_defaults();
let app = Engine.new(config);
```

##### `with_defaults() -> Engine`

Create application with default configuration.

```nv
let app = Engine.with_defaults();
```

##### `get(pattern: string, handler: Handler) -> RouteBuilder`

Register GET route.

```nv
use sake.{Engine, func_handler};

app.get("/users", func_handler(|ctx| {
    try? ctx.json({"users": []});
}));
```

##### `post(pattern: string, handler: Handler) -> RouteBuilder`

Register POST route.

##### `put(pattern: string, handler: Handler) -> RouteBuilder`

Register PUT route.

##### `delete(pattern: string, handler: Handler) -> RouteBuilder`

Register DELETE route.

##### `patch(pattern: string, handler: Handler) -> RouteBuilder`

Register PATCH route.

##### `add_middleware(middleware: Handler)`

Add global middleware.

```nv
use sake.middleware.logger.logger;
use sake.middleware.recovery.recovery;

app.add_middleware(logger());
app.add_middleware(recovery());
```

##### `group(path: string) -> RouterGroup`

Create a route group with common path prefix.

```nv
let api = app.group("/api");
api.get("/users", func_handler(|ctx| {
    try? ctx.json({"users": []});
}));
```

##### `run(address: string) throws`

Start the HTTP server.

```nv
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

```nv
app.add_middleware(func_handler(|ctx| {
    println("Before");
    try ctx.next();
    println("After");
}));
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

### RouteBuilder

Route configuration builder.

```nv
pub struct RouteBuilder
```

#### Methods

##### `worker() -> RouteBuilder`

Mark route for WorkerPool execution.

```nv
app.get("/compute", func_handler(|ctx| {
    // CPU-intensive work
})).worker();
```

##### `add_middleware(middleware: Handler) -> RouteBuilder`

Add route-specific middleware.

```nv
app.get("/protected", func_handler(|ctx| {
    ctx.string("Protected content");
})).add_middleware(auth_middleware);
```

##### `with_handler(handler: fn) -> RouteBuilder`

Set handler for worker routes.

```nv
fn my_handler(ctx: WorkerContext): WorkerResponse throws {
    return WorkerResponse.json(200, `{"status": "ok"}`);
}

app.get("/api", func_handler(|ctx| {}))
    .worker()
    .with_handler(my_handler);
```

##### `with_frozen(name: string, frozen: Frozen<T>) -> RouteBuilder throws`

Attach frozen data for worker thread access.

```nv
use std.sync.freeze;

let config = try freeze(Config { timeout: 30 });
app.get("/api", func_handler(|ctx| {}))
    .worker()
    .with_handler(my_handler)
    .with_frozen("config", config);
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

### Config

Server configuration.

```nv
pub struct Config
```

#### Methods

##### `with_defaults() -> Config`

Create default configuration.

```nv
let config = Config.with_defaults();
```

##### `with_worker_pool_size(size: int) -> Config`

Set worker pool size. 0 = auto-detect CPU count.

```nv
let config = Config.with_defaults()
    .with_worker_pool_size(4);
```

##### `with_worker_pool(enabled: bool) -> Config`

Enable/disable worker pool.

```nv
let config = Config.with_defaults()
    .with_worker_pool(false);  // Disable WorkerPool
```

##### `with_max_connections(max: int) -> Config`

Set maximum concurrent connections.

```nv
let config = Config.with_defaults()
    .with_max_connections(10000);
```

##### `with_request_timeout(timeout_ms: int) -> Config`

Set request timeout in milliseconds.

```nv
let config = Config.with_defaults()
    .with_request_timeout(30000);
```

##### `with_keep_alive(enabled: bool) -> Config`

Enable/disable HTTP Keep-Alive.

```nv
let config = Config.with_defaults()
    .with_keep_alive(true);
```

##### `with_keep_alive_timeout(timeout_ms: int) -> Config`

Set keep-alive idle timeout in milliseconds.

```nv
let config = Config.with_defaults()
    .with_keep_alive_timeout(30000);
```

---

## Middleware

### Built-in Middleware

#### `recovery() -> Handler`

Catches errors and prevents crashes.

```nv
use sake.middleware.recovery.recovery;

app.add_middleware(recovery());
```

#### `recovery_with_config(config: RecoveryConfig) -> Handler`

Recovery with custom configuration.

```nv
use sake.middleware.recovery.{recovery_with_config, RecoveryConfig};

let config = RecoveryConfig.with_defaults().with_details();
app.add_middleware(recovery_with_config(config));
```

#### `logger() -> Handler`

Logs requests with timing and colored output.

```nv
use sake.middleware.logger.logger;

app.add_middleware(logger());
```

#### `logger_with_config(config: LoggerConfig) -> Handler`

Logger with custom configuration.

```nv
use sake.middleware.logger.{logger_with_config, LoggerConfig};

let config = LoggerConfig.with_defaults().without_colors();
app.add_middleware(logger_with_config(config));
```

#### `cors() -> Handler`

CORS with default (permissive) settings.

```nv
use sake.middleware.cors.cors;

app.add_middleware(cors());
```

#### `cors_with_config(config: CorsConfig) -> Handler`

CORS with custom configuration.

```nv
use sake.middleware.cors.{cors_with_config, CorsConfig};

let config = CorsConfig.with_defaults()
    .with_origins(["https://example.com"])
    .with_credentials();

app.add_middleware(cors_with_config(config));
```

---

### CorsConfig

CORS configuration.

```nv
pub struct CorsConfig
```

#### Methods

##### `with_defaults() -> CorsConfig`

Create default configuration (allows all origins).

##### `with_origins(origins: [string]) -> CorsConfig`

Set allowed origins.

##### `with_methods(methods: [string]) -> CorsConfig`

Set allowed methods.

##### `with_headers(headers: [string]) -> CorsConfig`

Set allowed headers.

##### `with_credentials() -> CorsConfig`

Enable credentials.

##### `with_max_age(seconds: int) -> CorsConfig`

Set preflight cache max age.

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

## Types

### Handler

Handler interface for request handlers.

```nv
pub interface Handler {
    fn handle(self, ctx: Context) throws;
}
```

Use `func_handler()` to wrap closures:

```nv
use sake.func_handler;

let handler = func_handler(|ctx| {
    ctx.string("Hello!");
});
```

---

## Examples

### Basic Server

```nv
use sake.{Engine, func_handler};

fn main() throws {
    let app = Engine.with_defaults();

    app.get("/", func_handler(|ctx| {
        try? ctx.json({"message": "Hello!"});
    }));

    try app.run(":8080");
}
```

### With WorkerPool

```nv
use sake.{Engine, Config, func_handler};

fn main() throws {
    let config = Config.with_defaults()
        .with_worker_pool_size(4);

    let app = Engine.new(config);

    app.get("/compute/:n", func_handler(|ctx| {
        let n = ctx.param("n")?.parse::<int>() ?? 0;
        let result = fibonacci(n);
        try? ctx.json({"result": result});
    })).worker();

    try app.run(":8080");
}
```

### With Middleware

```nv
use sake.{Engine, func_handler};
use sake.middleware.recovery.recovery;
use sake.middleware.logger.logger;
use sake.middleware.cors.cors;

fn main() throws {
    let app = Engine.with_defaults();

    app.add_middleware(recovery());
    app.add_middleware(logger());
    app.add_middleware(cors());

    app.get("/", func_handler(|ctx| {
        ctx.string("OK");
    }));

    try app.run(":8080");
}
```

### Route Middleware

```nv
use sake.{Engine, func_handler};

fn main() throws {
    let app = Engine.with_defaults();

    let auth = func_handler(|ctx| {
        let token = ctx.header("Authorization");
        if (token == nil) {
            ctx.abort_with_status(401);
            return;
        }
        try ctx.next();
    });

    app.get("/protected", func_handler(|ctx| {
        ctx.string("Secret data");
    })).add_middleware(auth);

    try app.run(":8080");
}
```

### Custom Configuration

```nv
use sake.{Engine, Config, func_handler};

fn main() throws {
    let config = Config.with_defaults()
        .with_worker_pool_size(8)
        .with_max_connections(10000)
        .with_request_timeout(60000)
        .with_keep_alive(true);

    let app = Engine.new(config);

    app.get("/", func_handler(|ctx| {
        ctx.string("OK");
    }));

    try app.run(":8080");
}
```
