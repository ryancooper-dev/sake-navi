# Tasks: Concurrency and Parallelism Support

**Input**: Design documents from `/specs/001-concurrency-parallelism/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are included for all user stories to enable TDD and validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow existing Sake project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Read Navi skill documentation at .claude/skills/navi/SKILL.md to understand language syntax
- [ ] T002 [P] Review existing source files (src/context.nv, src/request.nv, src/response.nv) for baseline understanding
- [ ] T003 Create Config struct in src/config.nv with worker_pool_size, enable_worker_pool, max_connections, request_timeout fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create Engine struct skeleton in src/engine.nv with new(), run(), shutdown() methods
- [ ] T005 Create Router struct in src/router.nv with route registration and matching logic
- [ ] T006 [P] Create WorkerContext struct in src/worker_context.nv for serializable request context (path, method, headers, query, body)
- [ ] T007 [P] Implement JSON serialization/deserialization for WorkerContext in src/worker_context.nv
- [ ] T008 Add in_worker_pool() and worker_pool_size() query methods to Context in src/context.nv

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Concurrent Request Handling (Priority: P1) 🎯 MVP

**Goal**: Framework handles multiple concurrent I/O-bound requests efficiently using spawn + channel by default

**Independent Test**: Start a server with a simple route and send 100 concurrent HTTP requests. All requests should complete without blocking each other.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US1] Create test for basic spawn-based request handling in tests/test_concurrency.nv
- [ ] T010 [P] [US1] Create test for 100 concurrent I/O-bound requests in tests/test_concurrency.nv
- [ ] T011 [P] [US1] Create test for concurrent connections without blocking in tests/test_concurrency.nv

### Implementation for User Story 1

- [ ] T012 [US1] Implement TCP listener in Engine.run() in src/engine.nv
- [ ] T013 [US1] Implement accept loop that spawns a new task for each connection in src/engine.nv
- [ ] T014 [US1] Implement connection handler that reads HTTP request and creates Context in src/engine.nv
- [ ] T015 [US1] Implement route matching in Router.match() to find handler for request path in src/router.nv
- [ ] T016 [US1] Implement handler execution using spawn for concurrent processing in src/engine.nv
- [ ] T017 [US1] Implement response sending back to client in src/engine.nv
- [ ] T018 [US1] Add error handling for connection failures and malformed requests in src/engine.nv
- [ ] T019 [US1] Add graceful shutdown using channels to stop accept loop in src/engine.nv
- [ ] T020 [US1] Run tests to verify 100+ concurrent requests work without blocking

**Checkpoint**: At this point, User Story 1 should be fully functional - the framework handles concurrent I/O-bound requests using spawn

---

## Phase 4: User Story 2 - CPU-Intensive Route Optimization (Priority: P2)

**Goal**: Developers can mark routes with .worker() to execute CPU-intensive computations in parallel across CPU cores, achieving 5-7x performance improvement

**Independent Test**: Create a route with heavy computation (fibonacci(40)), mark it with .worker(), and measure throughput under load. Should see 5-7x improvement vs spawn-only mode.

### Tests for User Story 2

- [ ] T021 [P] [US2] Create test for WorkerPool initialization with vm.num_cpus() in tests/test_worker_pool.nv
- [ ] T022 [P] [US2] Create test for CPU-intensive route marked with .worker() in tests/test_worker_pool.nv
- [ ] T023 [P] [US2] Create benchmark comparing spawn vs WorkerPool for CPU-bound workload in tests/benchmark_workers.nv
- [ ] T024 [P] [US2] Create test for WorkerPool distributing work across threads in tests/test_worker_pool.nv

### Implementation for User Story 2

- [ ] T025 [US2] Add worker_mode field to Route struct in src/router.nv (enum: Spawn, Worker)
- [ ] T026 [US2] Implement .worker() method on RouteBuilder to mark routes as CPU-intensive in src/router.nv
- [ ] T027 [US2] Create WorkerPool struct in src/worker_pool.nv with new(size: int), submit(task), shutdown() methods
- [ ] T028 [US2] Implement WorkerPool initialization in Engine.new() using vm.num_cpus() when enabled in src/worker_pool.nv
- [ ] T029 [US2] Implement worker thread pool using Navi's Worker.pool() in src/worker_pool.nv
- [ ] T030 [US2] Implement task submission channel for sending work to worker threads in src/worker_pool.nv
- [ ] T031 [US2] Implement result channel for receiving responses from worker threads in src/worker_pool.nv
- [ ] T032 [US2] Modify Engine handler dispatch to check route.worker_mode in src/engine.nv
- [ ] T033 [US2] Implement WorkerPool execution path: serialize context → send to worker → receive result in src/engine.nv
- [ ] T034 [US2] Add worker pool graceful shutdown in Engine.shutdown() in src/engine.nv
- [ ] T035 [US2] Run benchmark to verify 5-7x performance improvement for CPU-bound routes

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - spawn for I/O, WorkerPool for CPU-intensive routes

---

## Phase 5: User Story 3 - Transparent Serialization (Priority: P2)

**Goal**: Route handler code remains identical whether running in spawn mode or WorkerPool mode - no manual serialization needed

**Independent Test**: Write a single route handler and run it both as a normal route and as a .worker() route. Handler code should be identical and both modes produce same results.

### Tests for User Story 3

- [ ] T036 [P] [US3] Create test for WorkerContext serialization roundtrip in tests/test_serialization.nv
- [ ] T037 [P] [US3] Create test for handler code working identically in both modes in tests/test_serialization.nv
- [ ] T038 [P] [US3] Create test for complex request context (headers, query, body) in WorkerPool in tests/test_serialization.nv
- [ ] T039 [P] [US3] Create test for JSON response serialization from WorkerPool in tests/test_serialization.nv

### Implementation for User Story 3

- [ ] T040 [US3] Implement Context.to_worker_context() serialization in src/context.nv
- [ ] T041 [US3] Implement WorkerContext.to_context() deserialization in src/worker_context.nv
- [ ] T042 [US3] Implement WorkerResponse struct in src/worker_context.nv for serializable responses (status, headers, body)
- [ ] T043 [US3] Implement automatic context serialization before WorkerPool dispatch in src/engine.nv
- [ ] T044 [US3] Implement automatic response deserialization after WorkerPool execution in src/engine.nv
- [ ] T045 [US3] Add JSON encode/decode error handling with clear error messages in src/worker_context.nv
- [ ] T046 [US3] Test that handler code works identically in spawn and WorkerPool modes
- [ ] T047 [US3] Verify serialization overhead is under 2% of total request time

**Checkpoint**: All core functionality complete - handlers work transparently in both execution modes

---

## Phase 6: User Story 4 - Configurable Concurrency (Priority: P3)

**Goal**: System administrators can configure WorkerPool size, connection limits, and other concurrency settings for their specific deployment needs

**Independent Test**: Start servers with different Config settings and verify worker pool size and connection limits are respected.

### Tests for User Story 4

- [ ] T048 [P] [US4] Create test for custom worker_pool_size configuration in tests/test_config.nv
- [ ] T049 [P] [US4] Create test for auto-detection when worker_pool_size=0 in tests/test_config.nv
- [ ] T050 [P] [US4] Create test for enable_worker_pool=false fallback to spawn in tests/test_config.nv
- [ ] T051 [P] [US4] Create test for max_connections limit enforcement in tests/test_config.nv

### Implementation for User Story 4

- [ ] T052 [US4] Implement Config.default() constructor with sensible defaults in src/config.nv
- [ ] T053 [US4] Implement Config validation (worker_pool_size >= 0, max_connections > 0) in src/config.nv
- [ ] T054 [US4] Implement auto-detection logic: if worker_pool_size == 0, use vm.num_cpus() in src/engine.nv
- [ ] T055 [US4] Implement enable_worker_pool check: if false, treat all routes as spawn mode in src/engine.nv
- [ ] T056 [US4] Implement max_connections tracking using counter in src/engine.nv
- [ ] T057 [US4] Implement connection queueing or rejection when at max_connections in src/engine.nv
- [ ] T058 [US4] Implement request_timeout using timeout pattern with channels in src/engine.nv
- [ ] T059 [US4] Add configuration logging at startup showing worker pool size, max connections in src/engine.nv
- [ ] T060 [US4] Test all configuration options work as expected

**Checkpoint**: All user stories complete - framework is fully configurable and production-ready

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T061 [P] Add comprehensive doc comments to all public APIs in src/engine.nv
- [ ] T062 [P] Add comprehensive doc comments to all public APIs in src/router.nv
- [ ] T063 [P] Add comprehensive doc comments to all public APIs in src/config.nv
- [ ] T064 [P] Add comprehensive doc comments to all public APIs in src/worker_pool.nv
- [ ] T065 [P] Add comprehensive doc comments to all public APIs in src/worker_context.nv
- [ ] T066 Create example application demonstrating spawn mode in examples/hello_world.nv
- [ ] T067 Create example application demonstrating .worker() for CPU-bound task in examples/cpu_intensive.nv
- [ ] T068 Create example showing configuration options in examples/custom_config.nv
- [ ] T069 [P] Update README.md with usage examples and API documentation
- [ ] T070 [P] Add edge case tests for worker crashes and recovery in tests/test_worker_pool.nv
- [ ] T071 [P] Add edge case tests for serialization failures in tests/test_serialization.nv
- [ ] T072 [P] Add edge case tests for WorkerPool saturation in tests/test_worker_pool.nv
- [ ] T073 Run all tests to ensure nothing broke during polish
- [ ] T074 Benchmark entire framework to validate 5-7x improvement claim

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 but independently testable
- **User Story 3 (P3)**: Depends on US2 completion (needs WorkerPool implementation) - NOT independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent of US2/US3

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes:
  - US1 can start immediately
  - US4 can start immediately (after US1 if desired, but independent)
  - US2 can start after US1 completes
  - US3 requires US2 completion
- All tests for a user story marked [P] can run in parallel
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create test for basic spawn-based request handling in tests/test_concurrency.nv"
Task: "Create test for 100 concurrent I/O-bound requests in tests/test_concurrency.nv"
Task: "Create test for concurrent connections without blocking in tests/test_concurrency.nv"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Create test for WorkerPool initialization with vm.num_cpus() in tests/test_worker_pool.nv"
Task: "Create test for CPU-intensive route marked with .worker() in tests/test_worker_pool.nv"
Task: "Create benchmark comparing spawn vs WorkerPool for CPU-bound workload in tests/benchmark_workers.nv"
Task: "Create test for WorkerPool distributing work across threads in tests/test_worker_pool.nv"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently with 100+ concurrent requests
5. Deploy/demo if ready - you have a working concurrent web framework!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - concurrent I/O handling!)
3. Add User Story 2 → Test independently → Deploy/Demo (CPU optimization!)
4. Add User Story 3 → Test independently → Deploy/Demo (transparent serialization!)
5. Add User Story 4 → Test independently → Deploy/Demo (full configurability!)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + User Story 4 (independent)
   - Developer B: Wait for US1, then do User Story 2
   - Developer C: Wait for US2, then do User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable (except US3 depends on US2)
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow Navi idioms from .claude/skills/navi/SKILL.md
- Use spawn + channel for concurrency (single-threaded)
- Use Worker.pool() for true parallelism (CPU-bound routes)
- All handlers maintain `|(ctx: Context)|` signature
- Test all public APIs and error paths
