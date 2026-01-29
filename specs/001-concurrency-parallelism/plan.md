# Implementation Plan: Concurrency and Parallelism Support

**Branch**: `001-concurrency-parallelism` | **Date**: 2026-01-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-concurrency-parallelism/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement dual-mode concurrency model for Sake web framework:
1. **Default spawn mode**: Single-threaded concurrency using Navi's spawn + channel for I/O-bound request handling
2. **Optional WorkerPool mode**: True parallelism using Navi's Worker.pool() for CPU-intensive routes marked with .worker()
3. **Transparent serialization**: Framework handles JSON serialization of request/response data when crossing process boundaries
4. **Performance target**: 5-7x throughput improvement for CPU-intensive workloads with WorkerPool

Technical approach: Extend existing Context/Request/Response structs with concurrency support, add Engine struct for server lifecycle, implement WorkerContext for serializable request state, and provide .worker() route marker API.

## Technical Context

**Language/Version**: Navi programming language (latest stable)
**Primary Dependencies**: Navi standard library only (std.io, std.net, std.json, std.vm)
**Storage**: N/A (web framework, no persistent storage)
**Testing**: Navi's built-in test framework (test blocks)
**Target Platform**: Linux/macOS servers (TCP socket-based HTTP server)
**Project Type**: Single library project (web framework)
**Performance Goals**:
- Default spawn mode: 10,000+ concurrent I/O-bound requests
- WorkerPool mode: 5-7x throughput improvement for CPU-intensive routes
- JSON serialization overhead: <2% of total request time
**Constraints**:
- Single-threaded concurrency by default (Navi's spawn model)
- JSON-only serialization for WorkerPool communication
- No external dependencies beyond Navi std library
**Scale/Scope**:
- Core framework API surface: ~10 public types
- Target: Production-ready web framework similar to Go's Gin

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Constitution Compliance

✅ **Navi-Idiomatic Design**: Feature uses spawn + channel for concurrency, Optional types, throws/try for errors, defer for cleanup
✅ **Simplicity Over Cleverness**: Explicit .worker() API marker, no hidden magic, clear separation of spawn vs WorkerPool
✅ **Type Safety**: Strong typing for Context, Request, Response, WorkerContext with compile-time safety
✅ **Performance by Default**: Zero-cost for spawn mode, opt-in WorkerPool only when needed
✅ **No Dependencies**: Uses only Navi std library (std.net, std.io, std.json, std.vm)
✅ **Handler Signature**: Maintains `|(ctx: Context)|` signature for all handlers
✅ **Testing**: Full test coverage required for concurrency primitives, serialization, and WorkerPool

**Status**: ✅ PASSED - No constitution violations detected

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── context.nv          # Request Context (EXISTING - extend for concurrency)
├── request.nv          # HTTP Request (EXISTING)
├── response.nv         # HTTP Response (EXISTING)
├── engine.nv           # NEW: Server engine with spawn/WorkerPool support
├── router.nv           # NEW: Route registration and matching
├── worker_context.nv   # NEW: Serializable context for WorkerPool
├── middleware/         # Middleware implementations (EXISTING)
└── utils/              # Utility functions (EXISTING)

tests/
├── test_concurrency.nv    # NEW: Spawn mode tests
├── test_worker_pool.nv    # NEW: WorkerPool mode tests
├── test_serialization.nv  # NEW: JSON serialization tests
└── benchmark_workers.nv   # NEW: Performance benchmarks (5-7x validation)
```

**Structure Decision**: Single project structure (web framework library). Existing Request/Response/Context structs will be extended with concurrency support. New Engine struct manages server lifecycle, Router handles routing, and WorkerContext enables transparent serialization for WorkerPool mode.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
