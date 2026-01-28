# Sake Web Framework Specification

> **Sake** (清酒) - A lightweight, Gin-inspired web framework for Navi

## Summary

Build a lightweight, Gin-inspired web framework for the Navi programming language. The framework should leverage Navi's unique features (single-threaded concurrency with spawn/channels, Optional types, Swift-style error handling) to provide a clean, ergonomic API for building HTTP servers and APIs.

## Background

Navi is a high-performance, statically-typed language that combines:
- **Rust-like** type system (struct + impl, Optional `T?`, enum, if-let)
- **Swift-like** error handling (throws/try/try?/try!)
- **Go-like** concurrency (spawn + channels, but single-threaded)
- **Go-like** resource management (defer)

The Go Gin framework is chosen as the primary reference because:
1. Simple, elegant API design
2. Middleware pattern fits Navi's functional style
3. Context-based request handling
4. Router groups for API versioning

## User Stories

### US-001: Basic HTTP Server
As a developer, I want to create a basic HTTP server with minimal boilerplate so that I can quickly prototype web applications.

**Acceptance Criteria:**
- Start server with `app.run(":8080")`
- Handle GET/POST/PUT/DELETE requests
- Return JSON, text, or HTML responses

### US-002: Route Registration
As a developer, I want to register routes with handler functions so that I can define my API endpoints clearly.

**Acceptance Criteria:**
- Register routes: `app.get("/path", handler)`
- Support path parameters: `/users/:id`
- Support wildcards: `/static/*filepath`

### US-003: Middleware Support
As a developer, I want to use middleware for cross-cutting concerns so that I can handle logging, auth, CORS without repeating code.

**Acceptance Criteria:**
- Global middleware: `app.use(logger())`
- Route-specific middleware
- Middleware chain with `ctx.next()`

### US-004: Router Groups
As a developer, I want to group routes with common prefixes and middleware so that I can organize my API by version or feature.

**Acceptance Criteria:**
- Create groups: `let api = app.group("/api/v1")`
- Group-level middleware
- Nested groups

### US-005: Request Context
As a developer, I want a unified context object for request/response handling so that I can access params, query, body, and send responses easily.

**Acceptance Criteria:**
- Access path params: `ctx.param("id")`
- Access query params: `ctx.query("page")`
- Parse JSON body: `ctx.bind_json::<T>()`
- Send responses: `ctx.json()`, `ctx.string()`, `ctx.html()`
- Set status: `ctx.status(201)`

### US-006: Error Handling
As a developer, I want graceful error handling so that my server doesn't crash on errors.

**Acceptance Criteria:**
- Recovery middleware catches panics
- Custom error responses
- Proper error propagation with Navi's `throws`

## Functional Requirements

### FR-001: Engine
- Create Engine struct as the main application entry point
- Support adding global middleware
- Support route registration
- Support starting HTTP server

### FR-002: Router
- Support HTTP methods: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
- Support static paths: `/users`
- Support path parameters: `/users/:id`
- Support wildcards: `/static/*filepath`
- Support router groups with prefix

### FR-003: Context
- Wrap Request and Response objects
- Provide parameter extraction methods
- Provide response helper methods (json, string, html)
- Support middleware data passing via `set`/`get`
- Support request body parsing

### FR-004: Middleware
- Handler type: `|(ctx: Context)|`
- Support `ctx.next()` for chain execution
- Support `ctx.abort()` to stop chain
- Built-in middleware: Logger, Recovery, CORS

### FR-005: HTTP Parsing
- Parse HTTP/1.1 requests
- Parse headers, query string, body
- Handle JSON content type
- Handle form data (basic)

### FR-006: Response
- Set status code
- Set headers
- Write body (string, JSON, bytes)
- Content-Type auto-detection

## Non-Functional Requirements

### NFR-001: Performance
- Handle concurrent requests using Navi's spawn
- Minimal memory allocation per request
- Connection pooling (future)

### NFR-002: Developer Experience
- Clear, readable error messages
- Comprehensive documentation
- Type-safe API

### NFR-003: Compatibility
- HTTP/1.1 support
- UTF-8 encoding
- Cross-platform (Linux, macOS, Windows)

## Success Criteria

1. **Working Example**: A complete example app demonstrating all features
2. **Test Coverage**: Unit tests for core components
3. **Documentation**: README with quick start guide
4. **Benchmarks**: Basic performance comparison (optional)

## Out of Scope (v1.0)

- HTTP/2 support
- WebSocket support
- Template rendering engine
- Database integrations
- Session management
- File upload handling (beyond basic)

## Technical Constraints

- Must use Navi language features only (no FFI for core)
- Single-threaded concurrency model
- No external dependencies for core framework
