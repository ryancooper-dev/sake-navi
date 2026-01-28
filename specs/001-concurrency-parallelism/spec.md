# Feature Specification: Concurrency and Parallelism Support

**Feature Branch**: `001-concurrency-parallelism`
**Created**: 2026-01-28
**Status**: Draft
**Input**: User description: "Update specs/spec.md to include the concurrency/parallelism design from specs/parallelism-spec.md: Key points to integrate: Default spawn + channel for I/O-bound requests (single-threaded concurrency), Optional WorkerPool for CPU-intensive routes marked with .worker(), Framework handles JSON serialization transparently, Performance: 5-7x speedup for heavy workloads with WorkerPool, API: .worker() method to mark CPU-intensive routes, User code remains the same for both modes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Concurrent Request Handling (Priority: P1)

As a web application developer, I want the framework to handle multiple concurrent requests efficiently by default, so that my application can serve many users simultaneously without blocking.

**Why this priority**: This is the foundation of any web framework. Without concurrent request handling, the framework cannot serve production traffic. This represents the minimum viable concurrency model.

**Independent Test**: Can be fully tested by starting a server with a simple route and sending multiple concurrent HTTP requests. Success means all requests complete without blocking each other, and delivers immediate value for I/O-bound applications.

**Acceptance Scenarios**:

1. **Given** a Sake application with a simple route handler, **When** 100 concurrent requests arrive, **Then** all requests are processed concurrently using spawn without blocking each other
2. **Given** a route handler that performs I/O operations (database, file, network), **When** multiple requests arrive simultaneously, **Then** the framework efficiently manages concurrent execution without manual thread management
3. **Given** a running server with active connections, **When** new requests arrive, **Then** the framework spawns new tasks for each connection without degrading performance

---

### User Story 2 - CPU-Intensive Route Optimization (Priority: P2)

As a developer building an API with CPU-intensive computations (image processing, data analysis, cryptography), I want to mark specific routes as CPU-intensive so the framework can execute them in parallel across multiple CPU cores, achieving significant performance improvements.

**Why this priority**: This addresses a specific performance bottleneck for CPU-bound workloads. While not every application needs this, it provides 5-7x speedup for heavy computation scenarios and differentiates the framework from basic concurrent-only solutions.

**Independent Test**: Can be fully tested by creating a route with heavy computation (e.g., calculating fibonacci(40)), marking it with .worker(), and measuring throughput under load. Success means measurable performance improvement (5-7x) compared to spawn-only mode.

**Acceptance Scenarios**:

1. **Given** a route marked with .worker() that performs heavy computation, **When** 100 concurrent requests arrive, **Then** requests are distributed across available CPU cores for parallel execution
2. **Given** a route with .worker() annotation, **When** a request is processed, **Then** the framework transparently serializes request data, executes in WorkerPool, and deserializes the response without user intervention
3. **Given** a CPU-intensive route under heavy load (100+ concurrent requests), **When** comparing spawn vs WorkerPool execution, **Then** WorkerPool delivers 5-7x performance improvement

---

### User Story 3 - Transparent Serialization (Priority: P2)

As a framework user, I want my route handler code to remain identical whether it runs in spawn mode or WorkerPool mode, so I don't have to write different code or manually handle serialization concerns.

**Why this priority**: This is critical for developer experience. Without transparent serialization, users would need to understand and manually handle JSON conversion, making the .worker() API error-prone and complex.

**Independent Test**: Can be tested by writing a single route handler and running it both as a normal route and as a .worker() route. Success means the handler code is identical and both modes produce the same results.

**Acceptance Scenarios**:

1. **Given** a route handler that accesses request context (params, query, body), **When** the route is marked with .worker(), **Then** the handler code remains unchanged and context is transparently available
2. **Given** a handler that returns JSON responses, **When** executed in WorkerPool, **Then** serialization and deserialization happen automatically without user code changes
3. **Given** a typical route handler, **When** switching between spawn and WorkerPool modes, **Then** no code changes are required beyond adding or removing .worker()

---

### User Story 4 - Configurable Concurrency (Priority: P3)

As a system administrator or DevOps engineer, I want to configure the framework's concurrency settings (WorkerPool size, connection limits) to optimize for my specific hardware and workload characteristics.

**Why this priority**: While sensible defaults work for most cases, production deployments benefit from tuning. This is lower priority because the framework provides automatic defaults (vm.num_cpus()) that work well out of the box.

**Independent Test**: Can be tested by starting servers with different Config settings and verifying that worker pool size and connection limits are respected. Success means observable behavioral changes matching configuration.

**Acceptance Scenarios**:

1. **Given** a Config with worker_pool_size set to 4, **When** the server starts, **Then** exactly 4 worker threads are created for parallel execution
2. **Given** a Config with worker_pool_size set to 0 (auto), **When** the server starts, **Then** the framework creates vm.num_cpus() worker threads automatically
3. **Given** a Config with enable_worker_pool set to false, **When** routes are marked with .worker(), **Then** they execute using spawn instead (graceful degradation)
4. **Given** a Config with max_connections limit, **When** connection count reaches the limit, **Then** new connections are queued or rejected appropriately

---

### Edge Cases

- What happens when a .worker() route is registered but enable_worker_pool is false? (Expected: graceful fallback to spawn mode)
- How does the system handle worker thread crashes during request processing? (Expected: error response to client, worker pool recovery)
- What happens when WorkerPool is saturated and new CPU-intensive requests arrive? (Expected: queueing with appropriate backpressure)
- How does the framework handle request data that cannot be serialized to JSON? (Expected: compile-time or runtime error with clear message)
- What happens when vm.num_cpus() returns an unexpected value (0 or negative)? (Expected: fallback to reasonable default like 2 or 4)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use spawn + channel for concurrent request handling by default (single-threaded concurrency)
- **FR-002**: Framework MUST provide a .worker() method to mark routes as CPU-intensive
- **FR-003**: Routes marked with .worker() MUST execute in a WorkerPool using true parallel execution across CPU cores
- **FR-004**: Framework MUST transparently serialize request context (path, method, headers, query, body) when dispatching to WorkerPool
- **FR-005**: Framework MUST transparently deserialize response data from WorkerPool before sending to client
- **FR-006**: User route handlers MUST have identical code whether running in spawn mode or WorkerPool mode
- **FR-007**: Framework MUST provide Config struct with worker_pool_size option (0 for auto-detection)
- **FR-008**: Framework MUST provide Config struct with enable_worker_pool boolean option
- **FR-009**: When worker_pool_size is 0 (auto), system MUST use vm.num_cpus() to determine pool size
- **FR-010**: When enable_worker_pool is false, routes marked with .worker() MUST fall back to spawn execution
- **FR-011**: WorkerPool MUST distribute CPU-intensive requests across available worker threads for parallel execution
- **FR-012**: Framework MUST accept connections in the main thread and dispatch to appropriate execution mode (spawn or WorkerPool)
- **FR-013**: Context API MUST provide in_worker_pool() method to query current execution mode
- **FR-014**: Context API MUST provide worker_pool_size() method to query WorkerPool size if enabled
- **FR-015**: System MUST handle serialization errors gracefully with meaningful error messages

### Key Entities

- **Config**: Configuration struct containing worker_pool_size (int, 0=auto), enable_worker_pool (bool), max_connections (int), and request_timeout (duration)
- **WorkerContext**: Serializable representation of request context containing path, method, headers, query parameters, and body
- **WorkerPool**: Thread pool executing CPU-intensive handlers with JSON-based request/response serialization
- **RouteHandler**: User-defined closure with signature |(ctx: Context)| that handles requests
- **Route**: Internal representation linking URL patterns to handlers and execution mode (spawn vs worker)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Default spawn mode handles at least 10,000 concurrent I/O-bound requests without performance degradation
- **SC-002**: CPU-intensive routes using WorkerPool achieve 5-7x throughput improvement over spawn mode under heavy load (100+ concurrent requests with 100k iterations per request)
- **SC-003**: JSON serialization overhead for WorkerPool requests remains under 2% of total request processing time for typical workloads
- **SC-004**: Framework automatically detects CPU core count and creates appropriate WorkerPool size without manual configuration (90% of users never need to configure worker_pool_size)
- **SC-005**: Route handlers require zero code changes when switching between spawn and WorkerPool modes (user only adds/removes .worker() marker)
- **SC-006**: Server startup time increases by less than 100ms when WorkerPool is enabled
- **SC-007**: Memory overhead per worker thread remains under 2MB for idle workers
- **SC-008**: System gracefully handles WorkerPool saturation with queuing or backpressure without crashing

## Assumptions

- Navi's vm.num_cpus() API reliably returns the number of available CPU cores
- Navi's Worker.pool() API supports creating thread pools with closures
- Request and response data structures can be represented as JSON-serializable types
- Typical web requests have serialization overhead under 10µs per request
- CPU-intensive routes have computation time significantly higher than serialization overhead (>400µs)
- Most web applications are I/O-bound and benefit from spawn mode; CPU-intensive routes are the exception
- Users understand the difference between I/O-bound and CPU-bound operations well enough to use .worker() appropriately

## Out of Scope

- Multi-process deployment models (Prefork, Master-Worker with fork())
- Unix socket support for inter-process communication
- SO_REUSEPORT socket sharing across processes
- Custom serialization formats beyond JSON
- Automatic detection of CPU-intensive routes (users must explicitly mark with .worker())
- Dynamic switching between spawn and WorkerPool based on runtime metrics
- Worker thread pool resizing at runtime
- Custom worker thread scheduling policies
