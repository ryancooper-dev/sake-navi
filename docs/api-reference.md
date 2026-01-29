# API Reference

Complete API documentation for Sake Framework.

## Engine

The main application container.

### Creating an Engine

```nv
use sake.Engine;
use sake.Config;

// Default configuration
let app = Engine.default();

// Custom configuration
let config = Config.with_defaults()
    .with_worker_pool_size(4);
let app = Engine.new(config);
```

### Methods

#### `default() -> Engine`
Creates an Engine with default configuration.

#### `new(config: Config) -> Engine`
Creates an Engine with custom configuration.

#### `run(addr: string) throws`
Starts the HTTP server on the specified address.

```nv
try app.run(":8080");        // Listen on all interfaces, port 8080
try app.run("127.0.0.1:3000"); // Listen on localhost only
```

#### `get(path: string, handler: HandlerFunc) -> Route`
Registers a GET route.

#### `post(path: string, handler: HandlerFunc) -> Route`
Registers a POST route.

#### `put(path: string, handler: HandlerFunc) -> Route`
Registers a PUT route.

#### `delete(path: string, handler: HandlerFunc) -> Route`
Registers a DELETE route.

#### `patch(path: string, handler: HandlerFunc) -> Route`
Registers a PATCH route.

#### `options(path: string, handler: HandlerFunc) -> Route`
Registers an OPTIONS route.

#### `head(path: string, handler: HandlerFunc) -> Route`
Registers a HEAD route.

#### `any(path: string, handler: HandlerFunc) -> Route`
Registers a route that matches any HTTP method.

#### `use(middleware: HandlerFunc)`
Adds global middleware.

#### `group(prefix: string) -> RouterGroup`
Creates a route group with a common prefix.

---

## Config

Server configuration.

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `worker_pool_size` | `int` | `0` | Worker threads (0 = auto-detect) |
| `enable_worker_pool` | `bool` | `true` | Enable/disable WorkerPool |
| `max_connections` | `int` | `10000` | Max concurrent connections |
| `request_timeout` | `int` | `30000` | Request timeout (ms) |

### Builder Methods

```nv
let config = Config.with_defaults()
    .with_worker_pool_size(4)
    .with_worker_pool(true)
    .with_max_connections(5000)
    .with_request_timeout(60000);
```

#### `with_defaults() -> Config`
Creates Config with default values.

#### `with_worker_pool_size(size: int) -> Config`
Sets worker pool size.

#### `with_worker_pool(enabled: bool) -> Config`
Enables/disables worker pool.

#### `with_max_connections(max: int) -> Config`
Sets maximum concurrent connections.

#### `with_request_timeout(ms: int) -> Config`
Sets request timeout in milliseconds.

#### `effective_worker_pool_size() -> int`
Returns actual pool size (auto-detects if 0).

#### `validate() throws`
Validates configuration values.

---

## Context

Request/response context passed to handlers.

### Request Methods

#### `method() -> string`
Returns HTTP method (GET, POST, etc.).

#### `path() -> string`
Returns request path without query string.

#### `uri() -> string`
Returns full URI including query string.

#### `param(name: string) -> string?`
Returns path parameter value.

#### `query(name: string) -> string?`
Returns query parameter value.

#### `default_query(name: string, default: string) -> string`
Returns query parameter or default value.

#### `header(name: string) -> string?`
Returns header value (case-insensitive).

#### `content_type() -> string?`
Returns Content-Type header value.

#### `body() -> string`
Returns request body.

#### `bind_json<T>() -> T throws`
Parses body as JSON into type T.

### Response Methods

#### `status(code: int)`
Sets response status code.

#### `set_header(name: string, value: string)`
Sets a response header.

#### `string(content: string)`
Sends plain text response.

#### `html(content: string)`
Sends HTML response.

#### `json(data: any) throws`
Sends JSON response.

#### `xml(content: string)`
Sends XML response.

#### `yaml(content: string)`
Sends YAML response.

#### `data(content_type: string, data: string)`
Sends response with custom content type.

#### `redirect(code: int, location: string)`
Sends redirect response.

### Middleware Control

#### `next() throws`
Executes next handler in chain.

#### `abort()`
Stops handler chain execution.

#### `abort_with_status(code: int)`
Aborts with status code.

#### `abort_with_error(code: int, message: string)`
Aborts with JSON error message.

#### `is_aborted() -> bool`
Returns true if request was aborted.

### Context Data

#### `set(key: string, value: any)`
Stores value in context.

#### `get(key: string) -> any?`
Retrieves value from context.

#### `get_string(key: string) -> string?`
Retrieves string value.

#### `get_int(key: string) -> int?`
Retrieves int value.

#### `get_bool(key: string) -> bool?`
Retrieves bool value.

#### `get_float(key: string) -> float?`
Retrieves float value.

### Worker Pool

#### `in_worker_pool() -> bool`
Returns true if running in worker pool.

#### `worker_pool_size() -> int`
Returns worker pool size.

---

## RouterGroup

Group of routes with common prefix and middleware.

### Creating Groups

```nv
let api = app.group("/api");
let v1 = api.group("/v1");  // Nested: /api/v1
```

### Methods

All HTTP method shortcuts are available:

```nv
group.get(path, handler)
group.post(path, handler)
group.put(path, handler)
group.delete(path, handler)
group.patch(path, handler)
group.options(path, handler)
group.head(path, handler)
group.any(path, handler)
```

#### `use(middleware: HandlerFunc)`
Adds middleware to group.

#### `group(prefix: string) -> RouterGroup`
Creates nested group.

---

## Route

A registered route.

### Methods

#### `use(middleware: HandlerFunc) -> Route`
Adds middleware to route.

#### `worker() -> Route`
Marks route for WorkerPool execution.

---

## Middleware

### Logger

```nv
use sake.middleware.logger.{logger, logger_with_config, LoggerConfig};

app.use(logger());

let config = LoggerConfig {
    format: "${method} ${path} ${status}",
    skip_paths: ["/health"],
    use_colors: true,
};
app.use(logger_with_config(config));
```

### Recovery

```nv
use sake.middleware.recovery.{recovery, recovery_with_config, RecoveryConfig};

app.use(recovery());

let config = RecoveryConfig {
    show_details: true,
    show_stack: false,
};
app.use(recovery_with_config(config));
```

### CORS

```nv
use sake.middleware.cors.{cors, cors_with_config, CorsConfig};

app.use(cors());

let config = CorsConfig {
    allowed_origins: ["*"],
    allowed_methods: ["GET", "POST", "PUT", "DELETE"],
    allowed_headers: ["Content-Type", "Authorization"],
    allow_credentials: false,
    max_age: 86400,
};
app.use(cors_with_config(config));
```

### Basic Auth

```nv
use sake.middleware.basic_auth.{basic_auth, basic_auth_with_config, BasicAuthConfig};

app.use(basic_auth({"admin": "secret"}));

let config = BasicAuthConfig {
    accounts: {"admin": "secret"},
    realm: "Protected",
    unauthorized_message: "Unauthorized",
};
app.use(basic_auth_with_config(config));
```

### Static Files

```nv
use sake.middleware.static.{static_files, static_with_config, StaticConfig};

app.use(static_files("/static", "./public"));

let config = StaticConfig {
    root: "./public",
    index_file: "index.html",
    enable_directory_listing: false,
};
app.get("/files/*filepath", static_with_config(config));
```

---

## Types

### HandlerFunc

```nv
type HandlerFunc = fn(ctx: Context) throws;
```

### WorkerMode

```nv
enum WorkerMode {
    Spawn,   // Default: single-threaded concurrency
    Worker,  // WorkerPool: multi-threaded parallelism
}
```

---

## HTTP Status Codes

Common status codes are available:

| Constant | Value | Description |
|----------|-------|-------------|
| `OK` | 200 | Success |
| `Created` | 201 | Resource created |
| `NoContent` | 204 | No content |
| `MovedPermanently` | 301 | Permanent redirect |
| `Found` | 302 | Temporary redirect |
| `NotModified` | 304 | Not modified |
| `BadRequest` | 400 | Bad request |
| `Unauthorized` | 401 | Unauthorized |
| `Forbidden` | 403 | Forbidden |
| `NotFound` | 404 | Not found |
| `MethodNotAllowed` | 405 | Method not allowed |
| `InternalServerError` | 500 | Server error |
| `BadGateway` | 502 | Bad gateway |
| `ServiceUnavailable` | 503 | Service unavailable |
