# Navi-Web Development Guidelines

## Project Overview

Building a Gin-inspired web framework for the Navi programming language.

## Key Resources

### Navi Language Skill
Located at `.claude/skills/navi/SKILL.md` - **READ THIS FIRST** before writing any Navi code.

Key Navi features:
- `fn` for functions, `struct` + `impl` for types
- `T?` for optionals, `nil` for null
- `throws`/`try`/`try?`/`try!` for errors
- `spawn` + `channel` for concurrency (single-threaded!)
- `defer` for cleanup

### Project Files
- `specs/spec.md` - Feature specification
- `constitution.md` - Project principles and rules
- `.specify/` - Speckit templates and scripts

## Development Workflow

Use speckit commands in order:
1. `/speckit.constitution` - Review/update principles
2. `/speckit.specify` - Refine specification
3. `/speckit.plan` - Create implementation plan
4. `/speckit.tasks` - Generate task list
5. `/speckit.implement` - Execute implementation

## Code Guidelines

### Must Follow
- Read `.claude/skills/navi/SKILL.md` before coding
- Use Navi idioms (see skill file for syntax)
- All handlers: `|(ctx: Context)|` signature
- Use Optional types, never raw nil checks
- Use `defer` for cleanup
- Test all public APIs

### Avoid
- `try!` unless absolutely necessary
- Deep nesting (use early returns)
- Shared mutable state (use channels)
- Any dependencies outside std library

## Quality Assurance

### Mandatory Checks Before Committing

**CRITICAL**: Every code change MUST pass these checks:

1. **Compilation Check**
   ```bash
   ~/.navi/navi compile
   ```
   - MUST compile without errors
   - Fix all syntax errors immediately
   - Verify all imports are correct

2. **Test Execution**
   ```bash
   ~/.navi/navi test
   ```
   - ALL tests MUST pass
   - No skipped or failing tests allowed
   - Add tests for new features

### Navi Language Resources

When encountering Navi syntax issues, consult these resources **IN ORDER**:

1. **Navi Skill** (Local)
   - Location: `.claude/skills/navi/SKILL.md`
   - References: `.claude/skills/navi/references/*.md`
   - Quick reference for syntax, patterns, and idioms

2. **Navi GitHub Repository**
   - Syntax References: https://github.com/navi-language/navi/tree/main/.claude/skills/navi/references
   - Example Code: https://github.com/navi-language/navi/tree/main/.claude/skills/navi/examples
   - Official test suite examples

3. **Standard Library Documentation**
   - Documentation: https://navi-lang.org/stdlib/
   - API reference for std library modules
   - Usage examples for built-in functions

### Common Navi Syntax Issues

- **Module imports**: Use `use module.Type;` not `use module::Type;`
- **Error handling**: `try?` returns `nil` on error (for functions that throw)
- **Validation**: Functions that throw have no return value when using `try?`
- **Testing**: Use `test "name" { }` blocks inline or in separate test files
- **Module structure**: Files at project root become modules automatically

### Spawn + WorkerPool Pattern (Channel Coordination)

**CRITICAL**: Never call `Worker.pool.map()` directly from within `spawn`. This causes permanent deadlock!

**Problem:**
```nv
// ❌ DEADLOCK - Never do this!
spawn {
    let result = Worker.pool.map(task);  // Blocks single-threaded spawn forever
}
```

**Why it fails:**
- Navi's `spawn` is single-threaded cooperative concurrency
- `Worker.pool.map()` is a blocking synchronous call
- Blocking call in single-threaded context = deadlock
- Measured: 3 RPS, 2.9M socket errors

**Solution - Channel Coordination:**
```nv
// ✅ CORRECT - Use channel coordination

// In spawn context (I/O layer)
spawn {
    let task_ch = worker_task_ch;

    // Create response channel
    let response_ch = channel::<WorkerResponse>();

    // Send task to main thread
    task_ch.send(WorkerTask {
        ctx_json,
        response_ch,
    });

    // Wait for response (yields, doesn't block)
    let response = response_ch.recv();
}

// In main thread (CPU layer)
while (true) {
    // Receive task (blocking OK in main thread)
    let task = worker_task_ch.recv();

    // Execute in WorkerPool (blocking OK here)
    let response = Worker.pool.map(task.ctx_json);

    // Send response back to spawn
    task.response_ch.send(response);
}
```

**Key Principles:**
1. **Separation of Concerns**:
   - Spawn thread: Handles I/O (non-blocking)
   - Main thread: Handles WorkerPool (blocking OK)

2. **Non-blocking Communication**:
   - `channel.send()` from spawn: Non-blocking
   - `channel.recv()` from spawn: Yields control (cooperative)
   - `channel.recv()` from main: Blocking (OK here)

3. **Performance**:
   - Channel coordination: 8,000 RPS ✅
   - Direct pool.map(): 3 RPS ❌

**See:** `ARCHITECTURE.md` for complete explanation

### Spawn Variable Capture Pattern

**CRITICAL**: When using `spawn` in module code, follow the Navi stdlib pattern for variable capture.

✅ **Correct Pattern** (from `std.net.http.server`):
```nv
spawn {
    // Re-assign variables inside spawn block to capture them
    let stream = stream;
    let counter_ch = self.conn_counter_ch;

    // Now use the variables
    try? self.handle_connection(stream);
}
```

❌ **Incorrect Pattern** (will fail in module compilation):
```nv
// Extract before spawn - doesn't work in modules
let stream_copy = stream;
spawn {
    try? handle_connection(stream_copy);  // Error: variable not exists
}
```

**Key Rules**:
1. **Re-assign inside spawn**: Use `let var = var;` at the start of spawn block
2. **Self is capturable**: Can access `self` fields and call `self` methods inside spawn
3. **Channels work**: Channel types can be captured and used for communication
4. **Pattern is required**: This pattern is necessary in module context, not just scripts

**Reference**:
- Implementation: `~/.navi/stdlib/std/net/http/server/http_server.nv`
- Tests: `playground/spawn_capture_test.nv`, `playground/test_spawn_impl.nv`
- Status: ✅ Enabled in `src/engine.nv:304-317`

## File Structure

```
navi-web/
├── src/
│   ├── main.nv           # Entry point / example
│   ├── engine.nv         # Engine struct
│   ├── router.nv         # Router and routing
│   ├── context.nv        # Request context
│   ├── middleware/       # Built-in middleware
│   │   ├── logger.nv
│   │   ├── recovery.nv
│   │   └── cors.nv
│   └── http/             # HTTP parsing
│       ├── request.nv
│       └── response.nv
├── tests/
│   └── *.nv
├── examples/
│   └── *.nv
├── specs/
│   └── spec.md
├── constitution.md
└── README.md
```

## After Each Implementation Phase

Request Codex review with:
```
codex -m o3 "Review this Navi code for the navi-web framework. Check for:
1. Navi idioms and best practices
2. Error handling completeness
3. Type safety
4. Performance concerns
5. Documentation quality"
```

## Current Task: Gin Parity Implementation

### Goal
Achieve 100% Gin feature parity with production-quality code, tests, and documentation.

### CRITICAL Requirements
1. **Every change must compile**: Run `navi compile` before committing
2. **All tests must pass**: Run `navi test sake/` after every change
3. **Follow Gin API design**: Match Gin's naming and patterns
4. **Comprehensive tests**: Match Gin's test coverage for each feature
5. **Documentation**: API docs, examples, and checklist updates

### Workflow for Each Feature
1. Check Gin docs/tests for the feature
2. Create tests first (TDD): `tests/test_<feature>.nv`
3. Implement until tests pass
4. Add example: `examples/<feature>.nv`
5. Update `docs/gin-parity-checklist.md`
6. Commit with descriptive message

### Priority Checklist
🔲 Request Binding (bind_form, bind_query, validation)
🔲 File responses (ctx.file, streaming)
🔲 Advanced routing (optional params if possible)
🔲 Additional Context helpers
🔲 Performance optimizations
🔲 Complete test coverage (>90%)

### Navi Resources
- Skill: `.claude/skills/navi/SKILL.md`
- References: `.claude/skills/navi/references/*.md`
- Examples: `.claude/skills/navi/examples/*.nv`
- Stdlib: https://navi-lang.org/stdlib/

### Quality Gates
- Compile: `navi compile main.nv`
- Tests: `navi test sake/`
- Review: `codex review --base origin/main`

## Recent Updates

### Dual-Mode Concurrency Architecture (2026-01-29) - v1.3.0

✅ **Production-ready dual-mode hybrid architecture** implemented

**Major Achievement**:
- Solved v1.2.0 TODO: "Re-enable spawn for concurrency"
- 80x performance improvement (100 RPS → 8,000 RPS)
- Zero deadlocks under sustained load
- Complete architecture documentation

**Architecture**:
Two execution modes with automatic selection:

1. **Spawn-Only Mode** (I/O-bound workloads)
   - Main thread accept loop
   - Each connection in spawn
   - Simple, efficient, low overhead
   - 8,000 RPS throughput

2. **WorkerPool Mode** (CPU-intensive routes)
   - Accept loop in spawn (I/O layer)
   - Main thread processes WorkerPool tasks (CPU layer)
   - Channel coordination prevents deadlock
   - 8,000 RPS with true parallelism

**Key Technical Discovery**:
```nv
// ❌ This causes deadlock (single-threaded cooperative spawn)
spawn {
    let response = Worker.pool.map(task);  // Blocks forever
}

// ✅ Channel coordination (proper solution)
spawn {
    task_ch.send(task);           // Non-blocking
    response = response_ch.recv(); // Yields
}
// Main thread calls pool.map() (blocking OK here)
```

**Implementation Details**:
- Variable capture following Navi stdlib pattern
- HTTP request reading until \r\n\r\n (not EOF)
- Bytes workaround for stdlib write_string bug
- Empty request handling
- Proper defer cleanup

**Performance**:
- Spawn-Only: 8,005 RPS, 12.75ms avg latency
- WorkerPool: 8,005 RPS, 12.75ms avg latency
- v1.2.0 Serial: ~100 RPS (80x improvement)
- Failed Direct: 3 RPS (2,668x improvement)

**Files Modified**:
- `src/engine.nv`: Dual-mode architecture (614 lines changed)
- `src/worker_task.nv`: Channel coordination structure (NEW)
- `README.md`: Accurate architecture documentation (413 lines changed)
- `ARCHITECTURE.md`: Complete technical docs (NEW, 573 lines)
- `CHANGELOG.md`: v1.3.0 release notes

**Testing**:
- ✅ Functionality: Single request, concurrent, high-load
- ✅ Performance: 30s sustained load tests
- ✅ Failure modes: Deadlock verification, error handling
- ✅ Both modes tested and validated

**Reference Implementations**:
- Navi stdlib: `~/.navi/stdlib/std/net/http/server/http_server.nv`
- Our tests: `test_spawn_server.nv`, `benchmark_server.nv`

### Concurrency Implementation (2026-01-29) - Initial

✅ **spawn enabled** for concurrent request handling in `src/engine.nv`

**Implementation Details**:
- Uses Navi stdlib pattern for variable capture
- Each connection handled in separate spawn task
- Proper cleanup with defer blocks
- Connection counting via channels

**Testing Status**:
- ✅ All spawn capture tests pass (12/12)
- ✅ Engine compiles without errors
- ✅ Variable capture works correctly
- ✅ Pattern matches stdlib implementation

**Files Modified**:
- `src/engine.nv`: spawn enabled (lines 304-317)
- `src/context.nv`: Context made public
- Removed unused static helper functions

**Documentation**:
- `README.md`: Architecture section updated
- `CLAUDE.md`: Spawn pattern documented
- `TEST_RESULTS.md`: Test summary created

**Reference Implementations**:
- Navi stdlib: `~/.navi/stdlib/std/net/http/server/http_server.nv`
- Test files: `playground/spawn_capture_test.nv`, `playground/test_spawn_impl.nv`, `playground/test_spawn_loop.nv`
