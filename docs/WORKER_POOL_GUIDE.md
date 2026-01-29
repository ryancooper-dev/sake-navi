# WorkerPool Guide

## Overview

WorkerPool enables CPU-intensive task processing in Sake using Navi's Worker threads. This guide explains the design, usage, and best practices.

## Design Pattern: Config/Runtime Separation

### The Problem

Navi channels cannot be serialized, so they cannot be stored as struct fields:

```navi
// ❌ This causes runtime panic
pub struct WorkerPool {
    tasks: channel<WorkerTask>,  // Error: unsupported type
}
```

### The Solution

**Separate configuration (serializable) from runtime (with channels)**:

```navi
// ✅ Configuration - can be stored as struct field
pub struct WorkerPoolConfig {
    size: int,
    timeout_secs: int,
}

// ✅ Runtime - created in function scope, contains channels
pub struct WorkerPoolRuntime {
    config: WorkerPoolConfig,
    tasks: channel<string>,      // Created at runtime
    responses: channel<string>,
    workers: [Worker],
}
```

## Basic Usage

### 1. Configure the Pool

Configuration can be stored in your struct:

```navi
use sake.Engine;
use worker_pool.WorkerPoolConfig;

let app = Engine.new();

// Option A: Use builder pattern
app.set_worker_pool(
    WorkerPoolConfig.new(4)
        .with_timeout(30)
        .with_queue_size(1000)
);

// Option B: Use with_workers shorthand
let app = Engine.with_workers(4);
```

### 2. Mark Routes for WorkerPool

Use `.worker()` to mark CPU-intensive routes:

```navi
// Normal route - uses spawn (single-threaded)
app.get("/light", |ctx| {
    ctx.json({"result": simple_calculation()});
});

// CPU-intensive route - uses WorkerPool (multi-threaded)
app.get("/compute/:n", |ctx| {
    let n = ctx.param("n") || "0";
    let result = heavy_computation(n);
    ctx.json({"result": result});
}).worker();  // ← Mark for WorkerPool
```

### 3. Start the Server

The runtime is created automatically when you start the server:

```navi
try app.run(":8080");
```

## Configuration Options

### Pool Size

```navi
// Auto-detect CPU count
let config = WorkerPoolConfig.new(0);

// Explicit size
let config = WorkerPoolConfig.new(4);
```

### Timeout

Prevent tasks from running indefinitely:

```navi
let config = WorkerPoolConfig.new(4)
    .with_timeout(30);  // 30 seconds

// No timeout
let config = WorkerPoolConfig.new(4)
    .with_timeout(0);
```

### Queue Size

Limit pending tasks:

```navi
let config = WorkerPoolConfig.new(4)
    .with_queue_size(1000);  // Max 1000 pending tasks
```

### Load Balancing

Choose how tasks are distributed:

```navi
use worker_pool.LoadBalanceStrategy;

// Round-robin (default)
let config = WorkerPoolConfig.new(4)
    .with_load_balance(LoadBalanceStrategy.RoundRobin);

// Least loaded worker
let config = WorkerPoolConfig.new(4)
    .with_load_balance(LoadBalanceStrategy.LeastLoaded);

// Random
let config = WorkerPoolConfig.new(4)
    .with_load_balance(LoadBalanceStrategy.Random);
```

## Advanced Usage

### Direct Runtime Management

For custom scenarios, you can manage the runtime directly:

```navi
use worker_pool.WorkerPoolConfig;

fn main() throws {
    // Create config
    let config = WorkerPoolConfig.new(4);

    // Start runtime (creates channels and workers)
    let runtime = try config.start();

    // Submit tasks
    let task = json.encode({"type": "compute", "data": 42});
    try runtime.submit(task);

    // Get result
    let result = try runtime.get_result();

    // With timeout
    let result = try runtime.get_result_timeout(30);
    if (result == nil) {
        println("Task timed out");
    }

    // Cleanup
    try runtime.shutdown();
}
```

### Multiple Worker Pools

Different pools for different task types:

```navi
pub struct Engine {
    router: Router,
    compute_pool_config: WorkerPoolConfig?,
    io_pool_config: WorkerPoolConfig?,
}

impl Engine {
    pub fn run(self, addr: string) throws {
        // Start separate pools
        let compute_pool = self.compute_pool_config?.start();
        let io_pool = self.io_pool_config?.start();

        // Route to appropriate pool
        if (route.task_type == "compute") {
            compute_pool?.submit(task);
        } else if (route.task_type == "io") {
            io_pool?.submit(task);
        }
    }
}
```

## Performance Considerations

### When to Use WorkerPool

**Use WorkerPool for:**
- Heavy computations (>100ms per request)
- CPU-bound algorithms
- Image/video processing
- Data encryption/decryption
- Complex calculations

**Don't use WorkerPool for:**
- Simple I/O operations
- Database queries (use spawn instead)
- Quick calculations (<10ms)
- Response serialization

### Benchmark Results

From `parallelism-spec.md`:

| Task Type | Sequential | spawn | WorkerPool | Best |
|-----------|-----------|-------|------------|------|
| Light (1ms) | 4.8ms | 4.8ms | 15.9ms | spawn |
| Heavy (100ms) | 4200ms | 4200ms | 850ms | WorkerPool |

**Key insight**: WorkerPool has overhead (~8µs per task for JSON serialization), but provides 5-7x speedup for heavy tasks.

### Serialization Overhead

WorkerPool requires JSON serialization for task data:

```navi
// Worker sees JSON strings
let task_json = `{"path": "/compute", "params": {"n": "10"}}`;
try pool.submit(task_json);

let result_json = try pool.get_result();
// result_json: `{"status": 200, "body": "..."}`
```

**Overhead**: ~8µs per task (negligible for tasks >100ms).

## Best Practices

### 1. Configure at Startup

Store config in your struct, create runtime at server start:

```navi
// ✅ Good
let app = Engine.new().set_worker_pool(config);
try app.run(":8080");  // Runtime created here

// ❌ Bad
let app = Engine.new();
let runtime = config.start();  // Where to store runtime?
```

### 2. Mark Routes Explicitly

Be intentional about which routes use WorkerPool:

```navi
// ✅ Clear intent
app.get("/compute", handler).worker();

// ❌ Unclear
app.get("/compute", handler);  // Uses spawn or WorkerPool?
```

### 3. Handle Timeouts

Protect against hung tasks:

```navi
let config = WorkerPoolConfig.new(4)
    .with_timeout(30);  // 30 second timeout

// Or handle timeout explicitly
let result = runtime.get_result_timeout(30);
if (result == nil) {
    ctx.abort_with_error(504, "Request timeout");
}
```

### 4. Graceful Shutdown

Always clean up resources:

```navi
impl Engine {
    pub fn run(self, addr: string) throws {
        let pool_runtime = self.worker_pool_config?.start();

        defer {
            if (let pool = pool_runtime) {
                try! pool.shutdown();
            }
        }

        // Server loop...
    }
}
```

## Testing

### Unit Tests

Test configuration:

```navi
test "worker pool config" {
    let config = WorkerPoolConfig.new(4)
        .with_timeout(30)
        .with_queue_size(500);

    assert_eq config.size, 4;
    assert_eq config.timeout_secs, 30;
    assert_eq config.queue_size, 500;
}
```

Test runtime:

```navi
test "worker pool runtime" {
    let config = WorkerPoolConfig.new(2);
    let runtime = try! config.start();

    let task = `{"id": 1}`;
    try! runtime.submit(task);

    let result = try! runtime.get_result();
    assert result.contains(`"id": 1`);

    try! runtime.shutdown();
}
```

### Integration Tests

Test with Sake Engine:

```navi
test "engine with worker pool" {
    let app = Engine.with_workers(2);

    app.get("/compute", |ctx| {
        ctx.json({"result": 42});
    }).worker();

    // Simulate request...
}
```

## Troubleshooting

### Issue: "unsupported type: channel"

**Cause**: Trying to store channel as struct field.

**Solution**: Use Config/Runtime pattern:

```navi
// ❌ Don't do this
struct MyStruct {
    ch: channel<int>,  // Error!
}

// ✅ Do this
struct MyStruct {
    config: WorkerPoolConfig,  // OK
}

fn run(self) {
    let runtime = try self.config.start();  // Creates channels
}
```

### Issue: Tasks timeout

**Cause**: Tasks take too long or workers are overloaded.

**Solutions**:
1. Increase timeout: `.with_timeout(60)`
2. Increase pool size: `WorkerPoolConfig.new(8)`
3. Use LeastLoaded strategy: `.with_load_balance(LoadBalanceStrategy.LeastLoaded)`

### Issue: Poor performance

**Causes**:
1. Task is too light (serialization overhead dominates)
2. Too many workers (context switching)
3. Wrong load balancing strategy

**Solutions**:
1. Profile task duration - only use WorkerPool for >100ms tasks
2. Set pool size to CPU count: `WorkerPoolConfig.new(0)`
3. Try different strategies: RoundRobin vs LeastLoaded

## Architecture

### Lifecycle

```
1. Configure (at app initialization)
   ↓
   WorkerPoolConfig { size, timeout, ... }

2. Start (when server starts)
   ↓
   WorkerPoolRuntime { channels, workers }

3. Run (during request handling)
   ↓
   submit(task) → Worker → get_result()

4. Shutdown (graceful termination)
   ↓
   runtime.shutdown()
```

### Thread Model

```
Main Thread:
  ├── TcpListener.accept()
  ├── spawn { handle_request() }  ← Normal routes
  └── spawn {
        pool.submit(task)          ← Worker routes
        pool.get_result()
      }

Worker Threads (Pool):
  ├── Worker 0: process_task()
  ├── Worker 1: process_task()
  └── Worker N: process_task()
```

### Data Flow

```
Request → JSON → WorkerPool → Worker → Result JSON → Response
         ↑                                           ↑
    Serialization                            Deserialization
    (~8µs overhead)                          (~8µs overhead)
```

## Examples

See `examples/basic_server.nv` for a complete working example.

## References

- [Parallelism Specification](../specs/parallelism-spec.md)
- [Navi Worker API](https://navi-lang.org/stdlib/worker/)
- [Analysis Document](../WORKERPOOL_ANALYSIS.md)
