# Context

The `Context` object provides access to request data and response methods.

## Request Data

### Path Parameters

```nv
// GET /users/123
let id = ctx.param("id");  // "123"
```

### Query Parameters

```nv
// GET /search?q=navi&limit=10
let q = ctx.query("q");           // "navi"?
let limit = ctx.query("limit");   // "10"?
let page = ctx.query("page");     // nil
```

### Headers

```nv
let content_type = ctx.header("Content-Type");
let auth = ctx.header("Authorization");
```

### Body

```nv
let body = ctx.body();  // Raw body as string
```

### JSON Binding

```nv
struct CreateUser {
    name: string,
    email: string,
}

let user = try ctx.bind_json::<CreateUser>();
```

## Response Methods

### String

```nv
ctx.string("Hello, World!");
```

### JSON

```nv
try ctx.json({
    "id": 1,
    "name": "Navi"
});
```

### Status Code

```nv
ctx.status(201);
ctx.string("Created");
```

### Headers

```nv
ctx.header("X-Custom", "value");
ctx.header("Cache-Control", "no-cache");
```

### Redirect

```nv
try ctx.redirect("/new-location");
try ctx.redirect_permanent("/moved");
```

### Binary Data

```nv
ctx.data("application/octet-stream", bytes);
```

### HTML

```nv
ctx.html("<h1>Hello</h1>");
```

## Cookies

### Get Cookie

```nv
let session = ctx.cookie("session_id");
```

### Set Cookie

```nv
ctx.set_cookie("session_id", "abc123");

// With options
ctx.set_cookie_with_options("session_id", "abc123", CookieOptions {
    max_age: 3600,
    http_only: true,
    secure: true,
    path: "/",
});
```

## Middleware Control

### Continue Chain

```nv
try ctx.next();
```

### Abort Chain

Simply return without calling `next()`:

```nv
if (!is_authenticated) {
    ctx.status(401);
    return;
}
```

## Full Example

```nv
app.post("/users", |ctx| {
    // Validate content type
    let ct = ctx.header("Content-Type") ?? "";
    if (!ct.starts_with("application/json")) {
        ctx.status(415);
        return;
    }

    // Bind JSON
    let user = try ctx.bind_json::<CreateUser>();

    // Process...
    let id = save_user(user);

    // Response
    ctx.status(201);
    ctx.header("Location", `/users/${id}`);
    try ctx.json({"id": id});
});
```
