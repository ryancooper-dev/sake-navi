# Router

Internal route matching. Usually accessed through `Engine`.

## Route Registration

Routes are registered through `Engine`:

```nv
app.get("/path", handler);
app.post("/path", handler);
```

## Path Patterns

### Static Paths

```nv
"/users"
"/api/v1/status"
```

### Parameters

Capture with `:name`:

```nv
"/users/:id"              // Matches /users/123
"/posts/:post_id/comments/:id"
```

### Wildcards

Match suffix with `*name`:

```nv
"/static/*filepath"       // Matches /static/css/main.css
```

## RouteBuilder

Returned from route registration. Allows chaining.

### `worker()`

Mark route for WorkerPool execution.

```nv
app.get("/compute", handler).worker();
```

### `add_middleware(handler)`

Add route-specific middleware.

```nv
app.get("/admin", handler)
    .add_middleware(auth);
```

## RouterGroup

Created with `app.group()`.

### `get(path, handler)`

Register GET route in group.

### `post(path, handler)`

Register POST route in group.

### `group(prefix)`

Create nested group.

```nv
let api = app.group("/api");
let v1 = api.group("/v1");
```

### `add_middleware(handler)`

Add middleware to group.

```nv
api.add_middleware(auth);
```
