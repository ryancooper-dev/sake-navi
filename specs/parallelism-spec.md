# Sake Web Framework - Concurrency & Parallelism Specification

## Summary

为 Sake 框架设计高效的并发处理架构，结合 Navi 的两种并发模型：
1. **`spawn` + `channel`** - 单线程并发，适合 I/O 密集型（默认）
2. **`Worker` / `WorkerPool`** - 多线程并行，适合 CPU 密集型（可选）

## 官方推荐模式：spawn + channel

来源：https://github.com/navi-language/navi/blob/main/.claude/skills/navi/examples/07-concurrency.nv

```nv
// Navi 使用 CONCURRENT (非 parallel) 执行
// 所有 spawn 任务在单线程运行

fn handle_connections(listener: TcpListener) throws {
    let results = channel::<Response>();

    while (true) {
        let conn = try listener.accept();
        
        // 每个连接 spawn 一个任务（非阻塞）
        spawn {
            let req = try! parse_request(conn);
            let resp = try! handle_request(req);
            try! results.send(resp);
        }
    }
}
```

### 官方模式特点

| 模式 | 线程 | 开销 | 适用 |
|------|------|------|------|
| `spawn` | 单线程 | 极低 | I/O 等待、网络 |
| `Worker` | 多线程 | 较高 | CPU 计算 |

### 性能测试结果

```
=== 轻量任务 (1k 迭代 x 1000 任务) ===
单线程:     4.8ms
WorkerPool: 15.9ms  ❌ 更慢（通信开销）

=== 重量任务 (100k 迭代 x 100 任务) ===
单线程:     42.2ms
WorkerPool:  8.5ms  ✅ 5x 加速
```

### JSON 序列化开销测试

WorkerPool 需要通过 JSON 序列化传递数据，实测开销：

```
JSON 序列化开销: 1000 次序列化+反序列化 = 8.4ms (每次约 8.4µs)
```

**重负载请求（100k 迭代）含 JSON 序列化：**

| 并发数 | 顺序执行 | spawn (无序列化) | WorkerPool + JSON | 加速比 |
|--------|----------|------------------|-------------------|--------|
| 10     | 4.3ms    | 7.6ms            | 3.5ms             | 1.2x   |
| 50     | 21.0ms   | 21.8ms           | 4.3ms             | 4.9x   |
| 100    | 41.9ms   | 44.1ms           | 6.3ms             | 6.7x   |

**关键发现**：即使加上 JSON 序列化开销，WorkerPool 仍然显著快于 spawn！

原因分析：
- JSON 序列化约 8µs/次
- 重负载计算约 400µs/次
- 序列化开销只占 **2%**
- 多核并行带来 **5-7x 加速**，远超序列化开销

### 结论

| 场景 | 推荐方案 | 原因 |
|------|----------|------|
| 简单请求 | 顺序/spawn | 计算时间 < 序列化开销 |
| 中等请求 | 视情况 | 临界点 |
| 重负载 | WorkerPool + JSON | 并行收益 >> 序列化开销 |

**对 Sake 的建议**：CPU 密集路由放心用 WorkerPool，JSON 开销可忽略！

---

## 语言能力调研结果

### ✅ 可用能力

| 功能 | API | 说明 |
|------|-----|------|
| CPU 核心数 | `vm.num_cpus()` | 返回可用 CPU 核心数 |
| Worker 多线程 | `Worker.create(closure)` | 创建独立线程执行 |
| Worker 池 | `Worker.pool(fn, n)` | 创建 n 个 Worker 的线程池 |
| 线程 ID | `Worker.thread_id()` | 获取当前线程 ID |
| 进程 ID | `process.pid()` | 获取当前进程 ID |
| 子进程 | `process.run()` | 执行子进程 |

### ❌ 不可用

| 功能 | 说明 |
|------|------|
| fork() | Navi 不支持 fork |
| 信号处理 | 未见公开 API |
| SO_REUSEPORT | TcpListener.bind() 未见选项 |

## 设计方案调整

### 原方案：多进程 (Prefork)
```
Master Process
    │
    └── fork() ──> Worker Process 1 (SO_REUSEPORT)
    └── fork() ──> Worker Process 2 (SO_REUSEPORT)
    └── fork() ──> Worker Process N (SO_REUSEPORT)
```
**问题**: Navi 无 fork()，无 SO_REUSEPORT

### 新方案：Worker 多线程 + Accept 分发

```
Main Thread
    │
    ├── TcpListener.bind(":8080")
    │
    └── accept() loop ─────────────────┐
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
    WorkerPool                     WorkerPool                    WorkerPool
    Thread 0                       Thread 1                      Thread N
    ├── spawn task 1               ├── spawn task 1              ├── spawn task 1
    ├── spawn task 2               ├── spawn task 2              ├── spawn task 2
    └── spawn task N               └── spawn task N              └── spawn task N
```

## 序列化边界设计

### 问题：WorkerPool 的序列化在哪里发生？

**spawn 模式**（无序列化）：
```
Request ──→ handler(ctx) ──→ Response
           直接传对象，无序列化
```

**WorkerPool 模式**（需要序列化）：
```
Request ──→ JSON ──→ WorkerPool ──→ JSON ──→ handler(ctx) ──→ Response ──→ JSON
            ↑              ↑                                      ↑
       框架序列化      框架反序列化                            框架序列化
```

**关键洞察**：序列化发生在**框架层**，不是用户层！

### 设计决策：方案 A - 框架透明处理 ✅ 已采用

用户代码完全一样，只需 `.worker()` 标记：

```nv
// 用户代码 - 与普通路由完全一致！
app.get("/compute", |ctx| {
    let n = ctx.query("n");           // 框架已反序列化
    let result = heavy_compute(n);
    ctx.json({"result": result});     // 框架会序列化
}).worker();                          // 仅此标记不同
```

框架内部处理：
1. WorkerPool 收到 JSON 字符串
2. 框架反序列化为 Context
3. 调用 handler
4. 框架序列化 Response

### 需要可序列化的类型

| 类型 | 序列化 | 说明 |
|------|--------|------|
| Request | ✅ 框架定义 | path, method, headers, body |
| Response | ✅ 框架定义 | status, headers, body |
| 用户自定义类型 | ❌ 不需要 | 在 handler 内部处理 |

### 框架内部 WorkerPool handler

```nv
fn worker_handler(ctx_json: string): string throws {
    // 1. 反序列化 Context
    let ctx = try json.parse::<WorkerContext>(ctx_json);
    
    // 2. 查找并执行用户 handler
    let route = router.match(ctx.path);
    let response = try route.handler(ctx);
    
    // 3. 序列化 Response
    return try json.to_string(response);
}
```

**优点**：用户无感知，API 简洁，仅需 `.worker()` 标记。

---

## 实现策略

### 策略 A: spawn + channel (默认推荐)

使用官方推荐的单线程并发模式：

```nv
use std.net.TcpListener;

struct Server {
    listener: TcpListener,
    router: Router,
}

impl Server {
    fn run(self) throws {
        while (true) {
            let conn = try self.listener.accept();
            
            // spawn 非阻塞处理每个连接
            spawn {
                let req = try! parse_request(conn);
                let resp = try! self.router.handle(req);
                try! conn.write(resp.to_bytes());
                try! conn.close();
            }
        }
    }
}
```

**优点**：
- 零通信开销
- 代码简单
- 适合绝大多数 Web 场景（I/O 密集）

### 策略 B: spawn + WorkerPool 混合模式

对 CPU 密集型请求启用 WorkerPool：

```nv
use std.worker.Worker;
use std.net.TcpListener;

fn heavy_compute(data: string): string throws {
    // CPU 密集计算
    return result;
}

struct Server {
    listener: TcpListener,
    router: Router,
    compute_pool: WorkerPool<string, string>?,
}

impl Server {
    fn new(addr: string, enable_parallel: bool): Server throws {
        let pool: WorkerPool<string, string>? = nil;
        if (enable_parallel) {
            pool = try Worker.pool(heavy_compute);
        }
        
        return Server {
            listener: try TcpListener.bind(addr),
            router: Router.new(),
            compute_pool: pool,
        };
    }
    
    fn run(self) throws {
        while (true) {
            let conn = try self.listener.accept();
            
            spawn {
                let req = try! parse_request(conn);
                
                // 根据路由决定是否用 WorkerPool
                let resp = if (req.path.starts_with("/compute/")) {
                    if (let pool = self.compute_pool) {
                        // CPU 密集路由 -> WorkerPool
                        try! pool.map(req.body)
                    } else {
                        try! heavy_compute(req.body)
                    }
                } else {
                    // 普通路由 -> 直接处理
                    try! self.router.handle(req)
                };
                
                try! conn.write(resp.to_bytes());
            }
        }
    }
}
```

### 策略 C: 多进程部署 (生产环境推荐)

**官方推荐**但 Navi 目前缺少 Unix socket，暂用 Nginx 负载均衡替代：

```
┌─────────────────────────────────────────────┐
│              Nginx (:8080)                  │
│         upstream sake_backend               │
└─────────────┬─────────────┬─────────────────┘
              │             │
    ┌─────────▼───┐   ┌─────▼─────────┐
    │  Worker 1   │   │  Worker N     │
    │  :8001      │   │  :800N        │
    │  spawn+chan │   │  spawn+chan   │
    └─────────────┘   └───────────────┘
```

**启动脚本**：
```nv
// cluster.nv - Master 启动多个 Worker
use std.process;
use std.vm;

fn main() throws {
    let workers = vm.num_cpus();
    println(`启动 ${workers} 个 Worker 进程...`);
    
    for (let i in 0..workers) {
        let port = 8001 + i;
        try process.run(
            "navi",
            args: ["run", "server.nv"],
            envs: {"PORT": `${port}`}
        );
        println(`Worker ${i} -> :${port}`);
    }
}
```

**Nginx 配置**：
```nginx
upstream sake_backend {
    least_conn;  # 最少连接负载均衡
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
    server 127.0.0.1:8004;
}

server {
    listen 8080;
    location / {
        proxy_pass http://sake_backend;
    }
}
```

**优点**：
- 进程隔离，崩溃不影响其他
- 可充分利用多核 CPU
- 无需改动 Sake 核心代码
- Nginx 提供健康检查、自动故障转移

**未来**：等 Navi 支持 Unix socket 后，可实现 Master-Worker fd 传递模式

## API 设计

### 简单用法（默认 spawn 模式）

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.new();
    
    app.get("/", |ctx| {
        ctx.json({"message": "Hello from Sake!"});
    });
    
    // 默认使用 spawn 并发处理请求
    try app.run(":8080");
}
```

### 启用 WorkerPool（CPU 密集场景）

```nv
use sake.{Engine, Config};

fn main() throws {
    let app = Engine.new();
    
    // 普通路由 - spawn 处理
    app.get("/", |ctx| {
        ctx.string("Hello!");
    });
    
    // CPU 密集路由 - WorkerPool 处理
    // 用户代码与普通路由完全一致，仅加 .worker() 标记
    app.get("/compute/:n", |ctx| {
        let n = ctx.param("n").parse_int() || 0;
        let result = heavy_computation(n);
        ctx.json({"result": result});
    }).worker();  // 框架透明处理序列化
    
    let config = Config {
        worker_pool_size: 0,  // 0 = auto (vm.num_cpus())
    };
    
    try app.run(":8080", config);
}
```

### 完整配置

```nv
use sake.{Engine, Config};

fn main() throws {
    let app = Engine.new();
    
    app.get("/health", |ctx| {
        ctx.json({
            "status": "ok",
            "pid": process.pid(),
        });
    });
    
    let config = Config {
        worker_pool_size: 4,      // WorkerPool 线程数，0 = auto
        max_connections: 10000,   // 最大并发连接
        request_timeout: 30.seconds(),
        enable_worker_pool: true, // 是否启用 WorkerPool
    };
    
    try app.run(":8080", config);
}
```

### Context API

```nv
impl Context {
    /// 当前请求是否在 WorkerPool 中处理
    fn in_worker_pool(self): bool;
    
    /// 获取 WorkerPool 大小（如果启用）
    fn worker_pool_size(self): int?;
}
```

## 技术验证 TODO

1. **Worker 与 TcpConnection**: 确认 TcpConnection 能否跨线程传递
2. **Worker 与 spawn**: 确认 Worker 内能否使用 spawn
3. **Worker 通信开销**: 测试 Worker.send/recv 的性能
4. **连接数限制**: 测试单进程多 Worker 的最大并发连接

## 预期性能

| 场景 | 单线程 | 4 Workers | 8 Workers |
|------|--------|-----------|-----------|
| Hello World QPS | ~50k | ~180k | ~300k |
| JSON API QPS | ~30k | ~100k | ~180k |
| CPU 密集型 | 受限 | ~3.5x | ~7x |

## 与原多进程方案对比

| 特性 | 多进程 (Prefork) | Worker 多线程 |
|------|------------------|---------------|
| 内存占用 | 较高 (进程隔离) | 较低 (共享内存) |
| 启动速度 | 较慢 | 快 |
| 通信成本 | IPC 开销 | 共享内存，低开销 |
| 隔离性 | 强 (崩溃不影响) | 弱 (线程崩溃可能影响) |
| 实现复杂度 | 需要 fork/signal | 使用现有 Worker API |
| Navi 支持 | ❌ 无 fork | ✅ 原生支持 |

## 实施计划

### Phase 1: 验证可行性
- [ ] 测试 Worker + TcpConnection
- [ ] 测试 WorkerPool 吞吐量
- [ ] 编写 benchmark

### Phase 2: 基础实现
- [ ] ParallelConfig 结构
- [ ] Engine.run_parallel() 方法
- [ ] 请求分发逻辑

### Phase 3: 优化
- [ ] 连接池
- [ ] Keep-alive 支持
- [ ] 优雅关闭

### Phase 4: 文档和测试
- [ ] 使用文档
- [ ] 性能测试
- [ ] 压力测试

## 结论

由于 Navi 没有 fork() 和 SO_REUSEPORT，原始的多进程 (prefork) 方案不可行。

**推荐使用 Worker 多线程方案**：
1. Navi 原生支持 Worker 和 WorkerPool
2. 实现更简单，无需处理进程管理
3. 通信开销更低 (共享内存 vs IPC)
4. 默认使用 `vm.num_cpus()` 自动适配

如需更强的隔离性，可以使用**多进程启动脚本 + Nginx** 作为回退方案。
