# Parallelism

Sake offers two execution modes for different workloads.

## Overview

| Mode | Best For | Execution |
|------|----------|-----------|
| **Spawn** (default) | I/O-bound | Concurrent, single-thread |
| **WorkerPool** | CPU-bound | Parallel, multi-thread |

## Spawn Mode

Default mode. Uses Navi's cooperative concurrency.

```nv
app.get("/api/users", func_handler(|ctx| {
    let users = db.query("SELECT * FROM users");
    try? ctx.json(users);
}));
```

Good for:
- Database queries
- HTTP/API calls
- File operations
- Any I/O-bound work

## WorkerPool Mode

For CPU-intensive routes. Mark with `.worker()`:

```nv
app.get("/compute/:n", func_handler(|ctx| {
    let n = ctx.param("n")?.parse::<int>() ?? 10;
    let result = fibonacci(n);  // CPU-bound
    try? ctx.json({"result": result});
})).worker();
```

Good for:
- Heavy computation
- Image processing
- Cryptography
- Data transformation

## Configuration

```nv
let config = Config.with_defaults()
    .with_worker_pool(true)      // Enable WorkerPool
    .with_worker_pool_size(8);   // 8 threads (0 = auto-detect)

let app = Engine.new(config);
```

## How It Works

### Spawn Mode

```
Main Thread
    │
    └─→ Accept → spawn { handle } → spawn { handle } → ...
```

Single-threaded cooperative concurrency. I/O operations yield automatically.

### WorkerPool Mode

```
Spawn (I/O)              Main Thread (CPU)
    │                          │
    ├─ Accept                  │
    ├─ Parse request           │
    │                          │
    └─→ Send task via channel ──→ Worker.pool.map()
    ←── Receive response ←─────┘
```

Channel-based coordination prevents deadlock between spawn and WorkerPool.

## Mixing Modes

Use both in the same app:

```nv
// I/O-bound: uses spawn (default)
app.get("/api/users", func_handler(|ctx| {
    let users = db.query("...");
    try? ctx.json(users);
}));

// CPU-bound: uses WorkerPool
app.get("/render/:id", func_handler(|ctx| {
    let image = render_image(id);
    ctx.data("image/png", image);
})).worker();
```

## Performance

| Mode | Throughput | Latency |
|------|------------|---------|
| Spawn + Keep-Alive | 45,000+ RPS | ~2.2ms |
| WorkerPool | 7,500-8,500 RPS | ~12ms |

Spawn mode is faster for I/O-bound work. Use WorkerPool only when you need true parallelism for CPU-intensive operations.

## Disable WorkerPool

If all your routes are I/O-bound:

```nv
let config = Config.with_defaults()
    .with_worker_pool(false);  // Disable WorkerPool entirely
```

This simplifies the architecture and removes channel coordination overhead.
