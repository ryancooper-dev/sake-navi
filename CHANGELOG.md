# Changelog

All notable changes to Sake will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-28

### Added - WorkerPool Support

#### Core WorkerPool Implementation
- **WorkerPoolConfig** - Serializable configuration for storing in struct fields
  - Auto-detect CPU count with `WorkerPoolConfig.new(0)`
  - Configurable queue size with `.with_queue_size()`
  - Configurable timeout with `.with_timeout()`
  - Load balancing strategies with `.with_load_balance()`
- **WorkerPoolRuntime** - Runtime with channels and active workers
  - `submit()` - Submit tasks to pool
  - `get_result()` - Get results (blocking)
  - `get_result_timeout()` - Get results with timeout
  - `shutdown()` - Graceful shutdown
  - Automatic load balancing (Round-robin, Least-loaded, Random)

#### Engine Integration
- `Engine.with_workers(count)` - Create Engine with WorkerPool
- `Engine.set_worker_pool(config)` - Set custom WorkerPool config
- `.worker()` route marker for CPU-intensive routes
- Automatic request/response serialization for WorkerPool
- Mixed execution: spawn for normal routes, WorkerPool for marked routes

#### Built-in Middleware
- **Recovery** - Catches errors and prevents server crashes
  - `recovery()` - Default recovery middleware
  - `recovery_with_handler()` - Custom error handler
- **Logger** - Request/response logging with timing
  - `logger()` - Plain text logging
  - `logger_colored()` - Colored output based on status
- **CORS** - Cross-Origin Resource Sharing
  - `cors_default()` - Permissive default config
  - `cors(config)` - Custom configuration
  - `CorsConfig` - Fine-grained CORS control

#### Router Enhancements
- Route-specific middleware with `.use(middleware)`
- Path parameters support (`:id`, `:name`)
- Wildcard routes support (`*filepath`)
- HTTP method helpers (get, post, put, delete, patch)
- Global middleware support
- Route matching with parameter extraction

#### Context API
- Path parameter access with `ctx.param()`
- Query parameter access with `ctx.query()`
- Header access with `ctx.header()`
- Request body parsing with `ctx.bind_json::<T>()`
- Response helpers: `json()`, `string()`, `html()`, `data()`
- Status code setting with `ctx.status()`
- Middleware control: `next()`, `abort()`, `abort_with_status()`
- Data passing between middleware with `set()` and `get()`

### Documentation
- **WORKER_POOL_GUIDE.md** - Comprehensive WorkerPool usage guide
  - Design pattern explanation (Config/Runtime separation)
  - Configuration options
  - Performance considerations
  - Best practices
  - Troubleshooting guide
- **API_REFERENCE.md** - Complete API documentation
  - All public types and methods
  - Code examples
  - Type signatures
- **WORKERPOOL_ANALYSIS.md** - Design analysis and trade-offs
  - Three design approaches evaluated
  - Scenario-based analysis
  - Performance benchmarks
  - Final recommendation and rationale
- Updated **README.md** with WorkerPool examples

### Examples
- **basic_server.nv** - Complete example demonstrating:
  - Basic routes
  - Path parameters
  - Query parameters
  - JSON responses
  - CPU-intensive routes with WorkerPool
  - Middleware usage
  - Error handling

### Tests
- **test_integration.nv** - Comprehensive integration tests
  - Router tests
  - Context tests
  - WorkerPool tests
  - Middleware tests
  - Engine tests
  - End-to-end scenarios
- Unit tests in all modules
  - `worker_pool.nv` - 8 tests
  - `router.nv` - 8 tests
  - `engine.nv` - 6 tests
  - `middleware/*.nv` - 7 tests
  - `context.nv` - 7 tests
  - `request.nv` - 6 tests
  - `response.nv` - 8 tests

### Performance
- **5-7x speedup** for CPU-intensive tasks with WorkerPool
- **Zero overhead** for normal routes (still use spawn)
- **~8µs serialization overhead** per WorkerPool task (negligible for >100ms tasks)
- Efficient load balancing strategies

### Architecture
- **Config/Runtime Separation Pattern** - Solves Navi's channel serialization constraint
- **Automatic Serialization** - Framework handles JSON encoding/decoding
- **Mixed Execution Model** - spawn and WorkerPool coexist seamlessly
- **Graceful Shutdown** - Clean resource cleanup

### Breaking Changes
None - This is a new feature release. Existing code continues to work without changes.

## [0.1.0] - 2026-01-15

### Added
- Initial release
- Basic HTTP server
- Request/Response parsing
- Context API
- Simple routing

---

## Upgrade Guide

### From 0.1.0 to 0.2.0

No breaking changes. To use new features:

#### Add WorkerPool Support

```navi
// Before (0.1.0)
let app = Engine.new();

// After (0.2.0) - with WorkerPool
let app = Engine.with_workers(4);

// Mark CPU-intensive routes
app.get("/compute", handler).worker();
```

#### Add Middleware

```navi
use sake.middleware.{recovery, logger, cors_default};

app.use(recovery());
app.use(logger());
app.use(cors_default());
```

#### Use Advanced Configuration

```navi
use worker_pool.{WorkerPoolConfig, LoadBalanceStrategy};

let config = WorkerPoolConfig.new(8)
    .with_timeout(60)
    .with_load_balance(LoadBalanceStrategy.LeastLoaded);

app.set_worker_pool(config);
```

---

## Future Roadmap

### 0.3.0 (Planned)
- HTTP/2 support
- WebSocket support
- Session management
- Template engine integration
- Static file serving with caching

### 0.4.0 (Planned)
- Database connection pooling
- ORM integration
- Authentication middleware
- Rate limiting
- Request validation

### 1.0.0 (Planned)
- Stable API
- Production-ready
- Comprehensive documentation
- Performance optimization
- Security hardening

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to Sake.

## License

Sake is licensed under the MIT License. See [LICENSE](LICENSE) for details.
