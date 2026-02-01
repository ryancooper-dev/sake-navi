# Performance

## Benchmarks

Tested with `wrk -t 4 -c 100 -d 30s`:

| Mode | Requests/sec | Latency (avg) |
|------|--------------|---------------|
| Spawn + Keep-Alive | 45,000+ | ~2.2ms |
| Spawn (no Keep-Alive) | 5,000-8,000 | ~3.5ms |
| WorkerPool | 7,500-8,500 | ~12ms |

## Keep-Alive

Enabled by default. Reuses TCP connections for multiple requests.

```nv
let config = Config.default()
    .with_keep_alive(true)           // Default: true
    .with_keep_alive_timeout(30000)  // 30s idle timeout
    .with_max_requests_per_connection(100);
```

Keep-Alive provides ~8x throughput improvement.

## Connection Limiting

Fast 503 rejection when at capacity:

```nv
let config = Config.default()
    .with_max_connections(10000);
```

Rejected clients receive:
```http
HTTP/1.1 503 Service Unavailable
Retry-After: 1
Connection: close
```

## Optimization Tips

### Use Spawn for I/O

Default spawn mode is faster for I/O-bound work:

```nv
// Good: I/O-bound in spawn
app.get("/users", |ctx| {
    let users = db.query("...");  // Yields during I/O
    try? ctx.json(users);
});
```

### Use WorkerPool Sparingly

Only for genuinely CPU-intensive work:

```nv
// Good: CPU-bound in WorkerPool
app.get("/hash", |ctx| {
    let hash = bcrypt(data);  // Actually CPU-intensive
    ctx.string(hash);
}).worker();
```

### Disable WorkerPool If Unused

If no routes need WorkerPool:

```nv
let config = Config.default()
    .with_worker_pool(false);  // Simpler architecture
```

## Resource Usage

| Mode | Memory/Connection | CPU | Threads |
|------|------------------|-----|---------|
| Spawn | ~1KB | Single core | 1 |
| WorkerPool | ~2KB | Multi-core | 1 + workers |

## Scaling

For maximum throughput:
- Enable Keep-Alive (default)
- Use spawn mode for I/O-bound routes
- Reserve WorkerPool for CPU-intensive routes
- Tune `max_connections` for your deployment
