# Navi 语言与 Sake 框架性能优化提案

**日期**: 2026-01-31
**状态**: 部分实施中
**版本**: 1.1

**更新记录**:
- 2026-01-31: Navi VM P0 优化已完成（批量 drain + Vec/take/replace）

---

## 目录

1. [问题背景](#1-问题背景)
2. [根因分析](#2-根因分析)
3. [Navi 语言层面优化](#3-navi-语言层面优化)
4. [Sake 框架层面优化](#4-sake-框架层面优化)
5. [实施路线图](#5-实施路线图)
6. [预期效果](#6-预期效果)

---

## 1. 问题背景

### 1.1 性能测试数据

| 并发连接数 | Requests/sec | 延迟 | 性能下降 |
|-----------|-------------|------|---------|
| 10 | 3,808 | 394µs | 基准 |
| 50 | 93 | 2.52ms | **-97.6%** |
| 100 | 1,668 | 3.55ms | -56.2% |

### 1.2 对比其他语言

| 语言/框架 | 100 连接 Req/sec | 特点 |
|----------|-----------------|------|
| Go (net/http) | 91,715 | M:N 调度，多核并行 |
| Node.js (http) | 30,009 | 单线程，高效事件循环 |
| **Navi (Sake)** | **1,668** | 单线程协程，调度器瓶颈 |

### 1.3 核心发现

**问题不是"调度器慢"，而是"调度器步子太小 + 固定开销太多"**

具体表现：
- 驱动 `FuturesUnordered` 的方式导致一次只处理一个 ready future
- N 个同时就绪需要 N 次完整的事件循环
- 每次循环的固定开销（借用检查、hash 操作等）被放大
- 形成恶性循环：任务堆积 → 更多循环 → 更多开销

---

## 2. 根因分析

### 2.1 当前调度循环

```rust
// navi-vm/src/vm.rs
'main_loop: loop {
    // 阶段 A: 处理所有已唤醒的协程
    while !wakeup_list.is_empty() {
        for id in wakeup_list2.iter().copied() {
            // ❌ 每次都 remove/insert HashMap
            let mut coroutine = vm_env.coroutines.borrow_mut().remove(&id);
            match coroutine.resume(()) {
                Yield(fut) => {
                    vm_env.coroutines.borrow_mut().insert(id, coroutine);
                    futures.push(fut);
                }
                Return(_) => { ... }
            }
        }
    }

    // GC 检查
    self.global_context.object_pool.garbage_collect(false);

    // 阶段 B: ❌ 每次只取一个 ready future
    tokio::select! {
        res = futures.next() => { wakeup_list.push(id); }
        item = new_fut_rx.recv() => { futures.push(fut); }
    }
}
```

### 2.2 瓶颈分解

| 瓶颈点 | 描述 | 影响 |
|--------|------|------|
| **高频小步** | `futures.next()` 每次只返回一个 | N 个就绪需要 N 轮循环 |
| **HashMap 开销** | remove/insert 操作 | 每次 resume 都有 hash 计算 |
| **RefCell 借用** | `borrow_mut()` 运行时检查 | 为绕过借用规则的"取出-放回"模式 |
| **Box 分配** | `Box<CoroutineInfo>` | 每个协程一次堆分配 |
| **栈切换** | corosensei resume | 每次 yield/resume 都切换 |

### 2.3 数学模型

```
50 连接同时活跃，每请求 3 次 yield：

  总 yield 次数/轮: 50 × 3 = 150
  每次 yield 开销: ~10µs (栈切换 + 借用 + hash)
  纯调度开销: 150 × 10µs = 1.5ms/轮

  加上实际 I/O 和处理时间: ~10-20ms/轮
  理论吞吐: 50 / 15ms × 1000 = 3,333 req/s

  但实际只有 93 req/s，说明存在更严重的问题：
  - 正反馈循环（任务堆积）
  - I/O 等待的低效处理
```

---

## 3. Navi 语言层面优化

### 3.1 P0: 批量 drain + 预算

**问题**: `futures.next().await` 每次只取一个 ready future。

**解决方案**: 先 await 一个，再用 `now_or_never` 批量拉取。

```rust
// 优化后的调度循环
'main_loop: loop {
    while !wakeup_list.is_empty() {
        // 处理唤醒的协程...
    }

    self.global_context.object_pool.garbage_collect(false);

    // ✅ 先 await 一个（必须等待）
    let id = futures.next().await.expect("BUG: no futures");
    wakeup_list.push(id);

    // ✅ 批量拉取其他已就绪的（带预算）
    let mut budget = 128;
    while budget > 0 {
        match futures.next().now_or_never().flatten() {
            Some(id) => {
                wakeup_list.push(id);
                budget -= 1;
            }
            None => break,
        }
    }
}
```

**预期效果**: 50 个同时就绪的 future，一轮就能处理完。

---

### 3.2 P0: Slab/Vec + take/replace

**问题**: HashMap remove/insert 开销 + RefCell 借用。

**解决方案**: 使用 `Vec<Option<CoroutineInfo>>` + take/replace 模式。

```rust
// 当前
coroutines: RefCell<HashMap<CoroutineId, Box<CoroutineInfo>>>

// 优化后
coroutines: Vec<Option<CoroutineInfo>>  // 无 RefCell，无 Box，无 Hash

// 使用方式
let mut coro = coroutines[id.0].take().unwrap();
match coro.coroutine.resume(()) {
    Yield(fut) => {
        coroutines[id.0] = Some(coro);  // 放回
        futures.push(fut);
    }
    Return(_) => {
        // coro 被 drop
    }
}
```

**优势**:
- 无 hash 计算（直接索引）
- 无 Box 分配（内联存储）
- 无 RefCell（take/replace 是安全的）

---

### 3.3 P1: 唤醒去重（标记位）

**问题**: 同一个协程可能被多次唤醒。

**解决方案**: 使用标记位而非 HashSet。

```rust
// 方案 A: 给 CoroutineInfo 增加字段
struct CoroutineInfo {
    coroutine: Coroutine,
    closure_id: Option<ObjectId>,
    queued: bool,  // 新增
}

// 方案 B: 单独维护 Vec<bool>
queued: Vec<bool>

// 使用
if !queued[id.0] {
    queued[id.0] = true;
    wakeup_list.push(id);
}

// resume 后清除
queued[id.0] = false;
```

---

### 3.4 P1: 减少 yield 次数

**注意**: 这需要加时间/步数预算，避免长任务饿死其他协程。

```rust
// 直通执行（带预算）
let mut steps = 0;
let max_steps = 10;

loop {
    match coro.resume(()) {
        Yield(fut) => {
            futures.push(fut);
            break;  // 真的需要等待 I/O
        }
        Return(_) => {
            // 协程完成，检查是否还有待处理的
            steps += 1;
            if steps >= max_steps {
                break;  // 让出，保证公平性
            }
            // 可以继续处理下一个
        }
    }
}
```

---

### 3.5 P2: poll-based 状态机（激进方案）

对于 HTTP 服务器这种固定模式，可以考虑用状态机替代协程：

```rust
enum HttpState {
    ReadingRequest(ReadState),
    ParsingHeaders,
    ReadingBody(usize),  // remaining bytes
    SendingResponse(WriteState),
    Done,
}

// 每次 poll 推进状态，而不是 resume 协程
impl Future for HttpConnection {
    fn poll(self: Pin<&mut Self>, cx: &mut Context) -> Poll<()> {
        loop {
            match &mut self.state {
                HttpState::ReadingRequest(r) => {
                    match r.poll(cx) {
                        Poll::Ready(data) => self.state = HttpState::ParsingHeaders,
                        Poll::Pending => return Poll::Pending,
                    }
                }
                // ...
            }
        }
    }
}
```

**优势**: 无栈切换开销。
**劣势**: 需要重写 HTTP 处理逻辑，复杂度高。

---

## 4. Sake 框架层面优化

在 Navi 语言不变的情况下，Sake 可以做以下优化。

### 4.1 P0: 连接数软限制

**目的**: 防止调度器饱和，保持在甜蜜区间（15-25 并发）。

```nv
pub struct Config {
    // ... existing fields ...

    /// 最大并发连接数（软限制）
    /// 超出时返回 503，不进入调度器
    pub max_concurrent_connections: int = 20,
}

impl Engine {
    fn run_with_connection_limit(self, listener: TcpListener) throws {
        let active = 0;
        let max_active = self.config.max_concurrent_connections;
        let dec_ch = channel::<bool>();

        loop {
            // 非阻塞检查完成通知
            while (let _ = try? dec_ch.try_recv()) {
                active -= 1;
            }

            let stream = try listener.accept();

            if (active >= max_active) {
                // 快速拒绝，不进入调度器
                try? stream.write("HTTP/1.1 503 Service Unavailable\r\nRetry-After: 1\r\n\r\n");
                try? stream.close();
                continue;
            }

            active += 1;
            spawn {
                defer { try? dec_ch.send(true); }
                try? self.handle_connection(stream);
            }
        }
    }
}
```

---

### 4.2 P0: Keep-Alive 连接复用

**目的**: 减少 spawn 总数，多个请求复用一个协程。

```nv
fn handle_connection_keepalive(self, stream: TcpStream) throws {
    let requests_handled = 0;
    let max_requests_per_conn = 100;
    let idle_timeout = 30.seconds();

    loop {
        // 带超时读取
        let raw = try? self.read_with_timeout(stream, idle_timeout);
        if (raw == nil) {
            break;  // 超时或连接关闭
        }

        let request = try Request.parse(raw!);
        let response = self.process_request(request);

        // 检查 Connection header
        let keep_alive = self.should_keep_alive(request);

        try stream.write(response);
        requests_handled += 1;

        if (!keep_alive || requests_handled >= max_requests_per_conn) {
            break;
        }
    }
}

fn should_keep_alive(self, request: Request): bool {
    let conn = request.header("connection");
    if (let c = conn) {
        return c.to_lowercase() != "close";
    }
    // HTTP/1.1 默认 keep-alive
    return request.version == "HTTP/1.1";
}
```

**效果**: 100 个请求可能只需要 10-20 个 spawn。

---

### 4.3 P1: 批量 I/O

**目的**: 减少每请求的 yield 次数。

```nv
/// 一次性读取完整请求
fn read_full_request(stream: TcpStream, timeout: Duration): string throws {
    let buffer = "";
    let max_size = 1024 * 1024;  // 1MB 上限

    loop {
        let chunk = try stream.read_with_timeout(4096, timeout);
        buffer = buffer + chunk;

        if (buffer.len() > max_size) {
            throw "Request too large";
        }

        // 检查是否读完
        if (self.is_request_complete(buffer)) {
            break;
        }

        if (chunk.len() == 0) {
            throw "Unexpected EOF";
        }
    }

    return buffer;
}

fn is_request_complete(self, buffer: string): bool {
    let header_end = buffer.find("\r\n\r\n");
    if (header_end == nil) {
        return false;
    }

    // 检查 Content-Length
    let cl = self.extract_content_length(buffer);
    if (let length = cl) {
        let body_start = header_end! + 4;
        return buffer.len() >= body_start + length;
    }

    return true;  // 无 body
}
```

---

### 4.4 P1: 响应预构建

**目的**: 减少字符串拼接和对象分配。

```nv
/// 预构建的响应缓存
struct ResponseCache {
    status_lines: <int, string>,
    common_headers: string,
}

impl ResponseCache {
    fn new(): ResponseCache {
        let status_lines: <int, string> = {:};
        status_lines[200] = "HTTP/1.1 200 OK\r\n";
        status_lines[201] = "HTTP/1.1 201 Created\r\n";
        status_lines[204] = "HTTP/1.1 204 No Content\r\n";
        status_lines[400] = "HTTP/1.1 400 Bad Request\r\n";
        status_lines[404] = "HTTP/1.1 404 Not Found\r\n";
        status_lines[500] = "HTTP/1.1 500 Internal Server Error\r\n";
        status_lines[503] = "HTTP/1.1 503 Service Unavailable\r\n";

        return ResponseCache {
            status_lines,
            common_headers: "Server: Sake\r\nConnection: keep-alive\r\n",
        };
    }

    fn build(self, status: int, content_type: string, body: string): string {
        let status_line = self.status_lines.get(status)
            || `HTTP/1.1 ${status} Unknown\r\n`;

        return `${status_line}${self.common_headers}Content-Type: ${content_type}\r\nContent-Length: ${body.len()}\r\n\r\n${body}`;
    }
}
```

---

### 4.5 P2: 延迟解析

**目的**: 只解析需要的部分，减少对象分配。

```nv
/// 延迟解析的请求
struct LazyRequest {
    raw: string,
    method: string,
    path: string,

    // 按需解析
    _headers: <string, string>?,
    _query: <string, string>?,
    _body: string?,
}

impl LazyRequest {
    /// 最小解析 - 只解析 method 和 path
    fn parse_minimal(raw: string): LazyRequest throws {
        let first_line_end = raw.find("\r\n") || throw "Invalid request";
        let first_line = raw.slice(0, first_line_end);

        let space1 = first_line.find(" ") || throw "Invalid request";
        let method = first_line.slice(0, space1);

        let rest = first_line.slice(space1 + 1, first_line.len());
        let space2 = rest.find(" ") || rest.len();
        let full_path = rest.slice(0, space2);
        let path = full_path.split("?")[0];

        return LazyRequest {
            raw,
            method,
            path,
            _headers: nil,
            _query: nil,
            _body: nil,
        };
    }

    /// 按需获取 headers
    fn headers(self): <string, string> {
        if (self._headers == nil) {
            self._headers = self.parse_headers();
        }
        return self._headers!;
    }

    /// 按需获取 query params
    fn query(self): <string, string> {
        if (self._query == nil) {
            self._query = self.parse_query();
        }
        return self._query!;
    }
}
```

---

### 4.6 P2: WorkerPool 智能分流

**目的**: CPU 密集型任务自动分到多线程。

```nv
/// 路由统计信息
struct RouteStats {
    total_requests: int,
    total_time_ms: float,
    max_time_ms: float,
}

impl Engine {
    /// 根据历史数据自动升级到 worker 模式
    fn maybe_upgrade_to_worker(self, route: Route) {
        let stats = self.route_stats.get(route.path);
        if (let s = stats) {
            let avg_time = s.total_time_ms / s.total_requests as float;

            // 平均处理时间 > 10ms 的路由升级为 worker
            if (avg_time > 10.0) {
                route.worker_mode = WorkerMode.Worker;
                println(`[AUTO] Upgraded ${route.path} to worker mode (avg: ${avg_time}ms)`);
            }
        }
    }
}
```

---

## 5. 实施路线图

### Phase 1: Navi VM 优化（需要 Navi 团队）

| 优先级 | 任务 | 预期效果 | 复杂度 | 状态 |
|--------|------|---------|--------|------|
| P0 | 批量 drain + now_or_never | 2-5x 吞吐提升 | 中 | ✅ 已完成 |
| P0 | Vec/Slab + take/replace | 20-50% 开销减少 | 低 | ✅ 已完成 |
| P1 | 唤醒去重（标记位） | 减少重复 resume | 低 | ✅ 已完成 |
| P1 | 直通执行（带预算） | 减少切换次数 | 中 | ✅ 已完成 |

**实施记录 (2026-01-31):**
- P0 批量 drain: `navi-vm/src/vm.rs` 第 179-208 行
- P0 Vec + take/replace: `navi-core/src/state.rs` 第 265-320 行
- P1 唤醒去重: `navi-core/src/state.rs` `try_queue()`/`clear_queued()` 方法
- P1 直通执行: `navi-vm/src/vm.rs` 第 168-180 行（在 GC/select 前先 drain ready futures）

### Phase 2: Sake 框架优化（可独立实施）

| 优先级 | 任务 | 预期效果 | 复杂度 | 状态 |
|--------|------|---------|--------|------|
| P0 | 连接数软限制 | 防止调度器饱和 | 低 | ✅ 已完成 |
| P0 | Keep-Alive 支持 | 减少 spawn 数量 | 中 | ✅ 已完成 |
| P1 | 批量 I/O | 减少 yield 次数 | 中 | 待实施 |
| P1 | 响应预构建 | 减少对象分配 | 低 | ✅ 已完成 |
| P2 | 延迟解析 | 减少无用解析 | 中 | 待实施 |
| P2 | WorkerPool 分流 | 智能负载均衡 | 高 | 待实施 |

**Sake 实施记录 (2026-01-31):**
- P0 连接数软限制: `engine.nv` `run_spawn_only()`, `run_with_worker_pool()` 方法
- P0 Keep-Alive 支持: `engine.nv` `handle_connection_keepalive()` 方法, `config.nv` 新增配置项
- P1 响应预构建: `response.nv` `STATUS_LINES` 预构建表, `build()` 使用 array join

---

## 6. 预期效果

### 6.1 Navi VM 优化后

| 场景 | 当前 | 优化后 | 提升 |
|------|------|--------|------|
| 50 连接 | 93 req/s | 400-900 req/s | 4-10x |
| 100 连接 | 1,668 req/s | 3,000-5,000 req/s | 2-3x |

### 6.2 Sake 框架优化后（语言不变）

| 场景 | 当前 | 优化后 | 原因 |
|------|------|--------|------|
| 50 连接 | 93 req/s | ~800 req/s | 连接限制 + Keep-Alive |
| spawn 数 | 50 | 15-20 | 连接限制 + 复用 |
| yield/请求 | 3-5 | 1-2 | 批量 I/O |

### 6.3 两者结合

```
理论上限估算：
  Navi VM 优化: 5x
  Sake 优化: 3x
  组合效果: ~10x

  50 连接: 93 → ~900 req/s
  100 连接: 1,668 → ~5,000 req/s
```

这仍然低于 Node.js 的 30,000 req/s，但已经从"高并发崩溃"变成"可用于生产的中低并发服务"。

---

## 附录

### A. 相关文件

- `navi-vm/src/vm.rs` - 调度循环
- `navi-core/src/state.rs` - 协程状态
- `sake-navi/src/engine.nv` - HTTP 服务器
- `sake-navi/src/request.nv` - 请求解析

### B. 参考资料

- [Navi Spawn 并发模型分析](/Users/nowa/Downloads/NAVI_SPAWN_ANALYSIS.md)
- [FuturesUnordered 文档](https://docs.rs/futures/latest/futures/stream/struct.FuturesUnordered.html)
- [corosensei 库](https://github.com/AdrianDaworke/corosensei)

### C. 测试命令

```bash
# 低并发测试
wrk -t2 -c10 -d10s http://localhost:8080/

# 中并发测试
wrk -t4 -c50 -d10s http://localhost:8080/

# 高并发测试
wrk -t4 -c100 -d10s http://localhost:8080/
```

---

**文档版本**: 1.0
**最后更新**: 2026-01-31
**作者**: Claude + Navi Community
