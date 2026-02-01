# Parallelism Guide

Sake supports two execution modes for handling requests: concurrent (spawn) and parallel (WorkerPool).

## Understanding the Modes

### Spawn Mode (Default)

Uses Navi's `spawn` for single-threaded concurrency:

```
                  ┌─ spawn { handle_request() }
Client requests → ├─ spawn { handle_request() }
                  └─ spawn { handle_request() }
```

**Best for:**
- I/O-bound workloads (database queries, HTTP calls, file I/O)
- Most web applications
- Low memory overhead

**Characteristics:**
- Single-threaded event loop
- Tasks interleave but don't run simultaneously
- Excellent for I/O-bound operations
- No thread synchronization overhead

### Worker Pool Mode

Uses multi-threaded workers for true parallelism:

```
                  ┌─ Worker 1 ─┬─ execute_handler()
Client requests → ├─ Worker 2 ─┼─ execute_handler()
                  └─ Worker N ─┴─ execute_handler()
```

**Best for:**
- CPU-intensive computations
- Data processing
- Image/video encoding
- Cryptographic operations

**Characteristics:**
- True parallel execution across CPU cores
- Higher memory overhead per worker
- Best when computation time >> context switch time

## Configuration

### Setting Up WorkerPool

```nv
use sake.{Engine, Config, func_handler};

fn main() throws {
    let config = Config.with_defaults()
        .with_worker_pool_size(4);     // 4 worker threads

    let app = Engine.new(config);

    // Routes...

    try app.run(":8080");
}
```

### Configuration Options

```nv
let config = Config.with_defaults()
    // Worker pool size (0 = auto-detect CPU count)
    .with_worker_pool_size(0)

    // Enable/disable worker pool entirely
    .with_worker_pool(true)

    // Max concurrent connections
    .with_max_connections(10000)

    // Request timeout in milliseconds
    .with_request_timeout(30000);
```

### Auto-Detect CPU Count

```nv
use std.vm;

let config = Config.with_defaults()
    .with_worker_pool_size(0);  // Auto-detect

// Or explicitly:
let cpu_count = vm.num_cpus();
let config = Config.with_defaults()
    .with_worker_pool_size(cpu_count);
```

## Using Worker Mode

### Mark Routes for Worker Pool

```nv
use sake.{Engine, Config, func_handler};

fn main() throws {
    let config = Config.with_defaults()
        .with_worker_pool_size(4);

    let app = Engine.new(config);

    // I/O-bound route (default spawn mode)
    app.get("/api/users", func_handler(|ctx| {
        let users = try? db.query("SELECT * FROM users");
        try? ctx.json(users);
    }));

    // CPU-intensive route (worker pool)
    app.get("/compute/fibonacci/:n", func_handler(|ctx| {
        let n = ctx.param("n")?.parse::<int>() ?? 10;
        let result = fibonacci(n);
        try? ctx.json({"result": result});
    })).worker();  // ← Execute in parallel

    // Image processing (worker pool)
    app.post("/images/resize", func_handler(|ctx| {
        let image = ctx.body();
        let resized = resize_image(image);
        ctx.data("image/png", resized);
    })).worker();

    try app.run(":8080");
}
```

### Worker Mode with Middleware

```nv
app.get("/heavy-compute", func_handler(|ctx| {
    // CPU-intensive work
})).add_middleware(auth_middleware()).worker();
```

### Worker Mode in Route Groups

```nv
let compute = app.group("/compute");

compute.get("/hash/:input", func_handler(|ctx| {
    let input = ctx.param("input") ?? "";
    let hash = compute_hash(input);
    try? ctx.json({"hash": hash});
})).worker();

compute.get("/encrypt", func_handler(|ctx| {
    // ...
})).worker();
```

## When to Use Each Mode

### Use Spawn (Default) When:

✅ Making database queries
✅ Calling external APIs
✅ Reading/writing files
✅ WebSocket connections
✅ Most CRUD operations

```nv
// These should use spawn (default)
app.get("/api/users", func_handler(|ctx| {
    let users = try? db.query("...");  // I/O wait
    try? ctx.json(users);
}));

app.get("/api/external", func_handler(|ctx| {
    let data = try? http.get("...");   // Network wait
    try? ctx.json(data);
}));
```

### Use Worker Pool When:

✅ Heavy computations (Fibonacci, sorting large datasets)
✅ Image/video processing
✅ Cryptographic operations
✅ Data compression/decompression
✅ Machine learning inference

```nv
// These should use worker pool
app.get("/compute/:n", func_handler(|ctx| {
    let n = ctx.param("n")?.parse::<int>() ?? 10;
    let result = expensive_math(n);  // CPU-bound
    try? ctx.json({"result": result});
})).worker();

app.post("/process-image", func_handler(|ctx| {
    let image = ctx.body();
    let processed = apply_filters(image);  // CPU-bound
    ctx.data("image/png", processed);
})).worker();
```

## Performance Considerations

### Pool Size Guidelines

| Workload Type | Recommended Pool Size |
|---------------|----------------------|
| Pure CPU computation | `num_cpus()` |
| Mixed CPU + some I/O | `num_cpus() * 2` |
| Memory-intensive | `num_cpus() / 2` |

### Memory Overhead

Each worker thread has its own stack (~2MB default). Consider:

```nv
// 16 workers = ~32MB stack memory
let config = Config.with_defaults()
    .with_worker_pool_size(16);
```

### Context Serialization

Worker pool requires serializing request context across threads:

```nv
// Context is serialized to JSON for worker threads
// Keep request/response data reasonably sized

app.post("/process", func_handler(|ctx| {
    let body = ctx.body();  // Serialized to worker
    // Process...
    try? ctx.json(result);  // Result serialized back
})).worker();
```

## Example: Hybrid Application

```nv
use sake.{Engine, Config, func_handler};
use std.vm;

fn main() throws {
    // Configure for mixed workload
    let config = Config.with_defaults()
        .with_worker_pool_size(vm.num_cpus())
        .with_max_connections(10000);

    let app = Engine.new(config);

    // === I/O-bound routes (spawn) ===

    app.get("/api/users", func_handler(|ctx| {
        let users = try? db.query("SELECT * FROM users");
        try? ctx.json(users);
    }));

    app.get("/api/posts/:id", func_handler(|ctx| {
        let id = ctx.param("id");
        let post = try? db.query(`SELECT * FROM posts WHERE id = ${id}`);
        try? ctx.json(post);
    }));

    // === CPU-bound routes (worker) ===

    app.get("/api/stats/compute", func_handler(|ctx| {
        let data = try? db.query("SELECT * FROM metrics");
        let stats = compute_statistics(data);  // CPU-intensive
        try? ctx.json(stats);
    })).worker();

    app.post("/api/images/thumbnail", func_handler(|ctx| {
        let image = ctx.body();
        let thumbnail = generate_thumbnail(image);  // CPU-intensive
        ctx.data("image/jpeg", thumbnail);
    })).worker();

    app.get("/api/reports/generate", func_handler(|ctx| {
        let params = ctx.query("params");
        let report = generate_report(params);  // CPU-intensive
        try? ctx.json(report);
    })).worker();

    try app.run(":8080");
}
```

## Disabling Worker Pool

For purely I/O-bound applications:

```nv
let config = Config.with_defaults()
    .with_worker_pool(false);  // Disable worker pool

let app = Engine.new(config);

// All routes use spawn mode, .worker() is ignored
app.get("/compute", func_handler(|ctx| {
    // Still runs in spawn mode
})).worker();  // ← Ignored when pool is disabled
```
