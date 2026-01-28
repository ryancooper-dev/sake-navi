# Navi-Web Implementation Tasks

## Phase 1: Core Types

### Task 1.1: Request Struct
**File**: `src/request.nv`
**Priority**: P0
**Effort**: 2h

```nv
struct Request {
    method: string,
    path: string,
    headers: <string, string>,
    query: <string, string>,
    body: string,
}
```

- [ ] Define Request struct
- [ ] Implement `parse(raw: string): Request throws`
- [ ] Implement `header(name: string): string?`
- [ ] Implement `parse_query(path: string): <string, string>`
- [ ] Write tests

### Task 1.2: Response Struct
**File**: `src/response.nv`
**Priority**: P0
**Effort**: 2h

```nv
struct Response {
    status: int,
    headers: <string, string>,
    body: string,
}
```

- [ ] Define Response struct
- [ ] Implement `new(): Response`
- [ ] Implement `header(name: string, value: string)`
- [ ] Implement `write(content: string)`
- [ ] Implement `build(): string` (HTTP response string)
- [ ] Write tests

### Task 1.3: Context Struct
**File**: `src/context.nv`
**Priority**: P0
**Effort**: 3h

```nv
struct Context {
    request: Request,
    response: Response,
    params: <string, string>,
    handlers: [HandlerFunc],
    index: int,
    keys: <string, any>,
}
```

- [ ] Define Context struct
- [ ] Implement `param(name: string): string?`
- [ ] Implement `query(name: string): string?`
- [ ] Implement `get_body(): string`
- [ ] Implement `json(data: any) throws`
- [ ] Implement `string(content: string) throws`
- [ ] Implement `html(content: string) throws`
- [ ] Implement `status(code: int): Context`
- [ ] Implement `set(key: string, value: any)`
- [ ] Implement `get(key: string): any?`
- [ ] Implement `next() throws`
- [ ] Implement `abort()`
- [ ] Write tests

## Phase 2: Router

### Task 2.1: Route Struct
**File**: `src/router.nv`
**Priority**: P0
**Effort**: 2h

```nv
type HandlerFunc = |(ctx: Context)|;

struct Route {
    method: string,
    path: string,
    handlers: [HandlerFunc],
}
```

- [ ] Define HandlerFunc type alias
- [ ] Define Route struct
- [ ] Implement path pattern matching
- [ ] Implement param extraction from path
- [ ] Write tests

### Task 2.2: RouterGroup Struct
**File**: `src/router.nv`
**Priority**: P0
**Effort**: 2h

```nv
struct RouterGroup {
    prefix: string,
    middlewares: [HandlerFunc],
    engine: Engine,
}
```

- [ ] Define RouterGroup struct
- [ ] Implement `use(middleware: HandlerFunc): RouterGroup`
- [ ] Implement `group(prefix: string): RouterGroup`
- [ ] Implement `get(path: string, handlers: ..HandlerFunc)`
- [ ] Implement `post(path: string, handlers: ..HandlerFunc)`
- [ ] Implement `put(path: string, handlers: ..HandlerFunc)`
- [ ] Implement `delete(path: string, handlers: ..HandlerFunc)`
- [ ] Write tests

## Phase 3: Engine

### Task 3.1: Engine Struct
**File**: `src/engine.nv`
**Priority**: P0
**Effort**: 3h

```nv
struct Engine {
    router_group: RouterGroup,
    routes: [Route],
}
```

- [ ] Define Engine struct
- [ ] Implement `new(): Engine`
- [ ] Implement route methods (get, post, etc.)
- [ ] Implement `use(middleware: HandlerFunc): Engine`
- [ ] Implement `group(prefix: string): RouterGroup`
- [ ] Write tests

### Task 3.2: Server Loop
**File**: `src/engine.nv`
**Priority**: P0
**Effort**: 4h

- [ ] Implement `run(addr: string) throws`
- [ ] TCP listener setup
- [ ] Accept loop
- [ ] Spawn per connection
- [ ] Request parsing
- [ ] Route matching
- [ ] Handler execution
- [ ] Response sending
- [ ] Connection cleanup with defer
- [ ] Write integration tests

## Phase 4: Middleware

### Task 4.1: Logger Middleware
**File**: `src/middleware/logger.nv`
**Priority**: P1
**Effort**: 1h

- [ ] Implement `logger(): HandlerFunc`
- [ ] Log method, path, status, duration
- [ ] Write tests

### Task 4.2: Recovery Middleware
**File**: `src/middleware/recovery.nv`
**Priority**: P1
**Effort**: 1h

- [ ] Implement `recovery(): HandlerFunc`
- [ ] Catch errors in do-catch
- [ ] Return 500 on error
- [ ] Log error message
- [ ] Write tests

### Task 4.3: CORS Middleware
**File**: `src/middleware/cors.nv`
**Priority**: P2
**Effort**: 1h

- [ ] Implement `cors(): HandlerFunc`
- [ ] Set CORS headers
- [ ] Handle OPTIONS preflight
- [ ] Write tests

## Phase 5: Examples & Docs

### Task 5.1: Hello World Example
**File**: `examples/hello.nv`
**Priority**: P1
**Effort**: 0.5h

- [ ] Basic server with single route
- [ ] Demonstrate JSON response

### Task 5.2: REST API Example
**File**: `examples/rest_api.nv`
**Priority**: P1
**Effort**: 1h

- [ ] CRUD routes for a resource
- [ ] Router groups
- [ ] Middleware usage

### Task 5.3: README
**File**: `README.md`
**Priority**: P1
**Effort**: 1h

- [ ] Quick start guide
- [ ] API overview
- [ ] Examples section

## Codex Review Checkpoints

After each phase completion:
1. **Phase 1 complete** → Codex review core types
2. **Phase 2 complete** → Codex review router
3. **Phase 3 complete** → Codex review engine
4. **Phase 4 complete** → Codex review middleware
5. **All phases complete** → Final Codex review

## Estimated Total: ~20-24 hours
