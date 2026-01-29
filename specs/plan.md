# Navi-Web Implementation Plan

## Technical Context

### Language: Navi
- Statically typed with type inference
- Single-threaded concurrency via `spawn` + `channel`
- Optional types (`T?`) for null safety
- Error handling: `throws`/`try`/`try?`/`try!`
- `defer` for cleanup
- `struct` + `impl` pattern

### Architecture Decision
Follow Gin's architecture adapted for Navi:
- **Engine**: Main application, holds routes and middleware
- **Router**: Route tree with path parameter extraction
- **RouterGroup**: Grouped routes with common prefix/middleware
- **Context**: Request/response wrapper, single interface for handlers
- **Middleware**: Functions with `ctx.next()` chain pattern

## Project Structure

```
navi-web/
├── src/
│   ├── lib.nv            # Public exports
│   ├── engine.nv         # Engine struct
│   ├── router.nv         # Router, Route, RouterGroup
│   ├── context.nv        # Context struct
│   ├── request.nv        # HTTP Request parsing
│   ├── response.nv       # HTTP Response building
│   ├── middleware/
│   │   ├── mod.nv        # Middleware exports
│   │   ├── logger.nv     # Logger middleware
│   │   ├── recovery.nv   # Panic recovery
│   │   └── cors.nv       # CORS middleware
│   └── utils/
│       ├── json.nv       # JSON helpers
│       └── path.nv       # Path matching
├── examples/
│   ├── hello.nv          # Basic example
│   └── rest_api.nv       # REST API example
├── tests/
│   ├── router_test.nv
│   ├── context_test.nv
│   └── middleware_test.nv
└── README.md
```

## Implementation Phases

### Phase 1: Core Types (Foundation)
Files: `request.nv`, `response.nv`, `context.nv`

1. **Request struct**
   - Method, path, headers, query params, body
   - Parse from raw HTTP string
   
2. **Response struct**
   - Status code, headers, body
   - Build HTTP response string

3. **Context struct**
   - Wrap Request + Response
   - Param/query/body access methods
   - Response helpers (json, string, html)

### Phase 2: Router (Routing)
Files: `router.nv`

1. **Route struct**
   - Method, path pattern, handlers
   
2. **RouterGroup struct**
   - Prefix, middleware, parent reference
   - Route registration methods

3. **Path matching**
   - Static paths: `/users`
   - Parameters: `/users/:id`
   - Wildcards: `/static/*filepath`

### Phase 3: Engine (Server)
Files: `engine.nv`

1. **Engine struct**
   - Routes collection
   - Global middleware
   - RouterGroup (self as root)

2. **Server loop**
   - TCP listener
   - Accept connections
   - Spawn handler per connection
   - Parse request, route, execute

### Phase 4: Middleware (Cross-cutting)
Files: `middleware/*.nv`

1. **Logger** - Request logging with timing
2. **Recovery** - Catch panics, return 500
3. **CORS** - Cross-origin headers

### Phase 5: Examples & Tests
Files: `examples/*.nv`, `tests/*.nv`

1. Hello world example
2. REST API example
3. Unit tests for each component

## Constitution Check

✅ Navi-idiomatic: Using struct+impl, Optional, throws, spawn
✅ Simplicity: Minimal API surface, explicit behavior
✅ Type safety: Strongly typed handlers and context
✅ Performance: spawn per connection, efficient routing

## Dependencies

- **std.net**: TCP server/client
- **std.io**: Reading/writing
- **std.json**: JSON encoding/decoding (if available)
- **std.time**: Timestamps for logging

## Gate Result

**PASS** - Ready for task generation
