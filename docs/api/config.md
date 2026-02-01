# Config

Server configuration options.

## Constructor

### `Config.default()`

Create with default values.

```nv
let config = Config.default();
```

## Builder Methods

All methods return `Config` for chaining.

### `with_worker_pool_size(size: int)`

Set worker thread count. `0` for auto-detect.

```nv
.with_worker_pool_size(8)   // 8 threads
.with_worker_pool_size(0)   // Auto-detect CPU count
```

**Default:** `0`

### `with_worker_pool(enabled: bool)`

Enable or disable WorkerPool.

```nv
.with_worker_pool(true)   // Enable
.with_worker_pool(false)  // Disable
```

**Default:** `true`

### `with_max_connections(max: int)`

Maximum concurrent connections.

```nv
.with_max_connections(10000)
```

**Default:** `10000`

### `with_request_timeout(timeout_ms: int)`

Request timeout in milliseconds. `0` for no timeout.

```nv
.with_request_timeout(30000)  // 30 seconds
```

**Default:** `30000`

### `with_keep_alive(enabled: bool)`

Enable HTTP Keep-Alive.

```nv
.with_keep_alive(true)
```

**Default:** `true`

### `with_keep_alive_timeout(timeout_ms: int)`

Keep-Alive idle timeout.

```nv
.with_keep_alive_timeout(30000)  // 30 seconds
```

**Default:** `30000`

### `with_max_requests_per_connection(max: int)`

Maximum requests per Keep-Alive connection.

```nv
.with_max_requests_per_connection(100)
```

**Default:** `100`

## Example

```nv
let config = Config.default()
    .with_worker_pool(true)
    .with_worker_pool_size(8)
    .with_max_connections(20000)
    .with_request_timeout(60000)
    .with_keep_alive(true)
    .with_keep_alive_timeout(30000);

let app = Engine.new(config);
```

## Default Values

| Option | Default |
|--------|---------|
| `worker_pool_size` | `0` (auto) |
| `enable_worker_pool` | `true` |
| `max_connections` | `10000` |
| `request_timeout` | `30000` |
| `enable_keep_alive` | `true` |
| `keep_alive_timeout` | `30000` |
| `max_requests_per_connection` | `100` |
