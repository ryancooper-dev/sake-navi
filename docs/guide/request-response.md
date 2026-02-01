# Request & Response

## Request

### Properties

```nv
ctx.request.method   // "GET", "POST", etc.
ctx.request.path     // "/users/123"
ctx.request.version  // "HTTP/1.1"
```

### Path Parameters

```nv
// Route: /users/:id/posts/:post_id
let user_id = ctx.param("id");
let post_id = ctx.param("post_id");
```

### Query String

```nv
// URL: /search?q=navi&limit=10
let q = ctx.query("q");           // "navi"?
let limit = ctx.query("limit");   // "10"?
```

### Headers

```nv
let auth = ctx.header("Authorization");
let content_type = ctx.header("Content-Type");
```

### Body

```nv
let raw = ctx.body();  // Raw string
```

### JSON Binding

```nv
struct CreateUser {
    name: string,
    email: string,
    age: int?,
}

let user = try ctx.bind_json::<CreateUser>();
println(user.name);
```

### Cookies

```nv
let session = ctx.cookie("session_id");
```

## Response

### Status Code

```nv
ctx.status(200);  // OK
ctx.status(201);  // Created
ctx.status(404);  // Not Found
ctx.status(500);  // Internal Server Error
```

### Headers

```nv
ctx.set_header("Content-Type", "text/plain");
ctx.set_header("X-Request-Id", request_id);
ctx.set_header("Cache-Control", "max-age=3600");
```

### Body

**Plain Text:**
```nv
ctx.string("Hello, World!");
```

**JSON:**
```nv
try ctx.json({
    "status": "ok",
    "data": items
});
```

**HTML:**
```nv
ctx.html("<h1>Welcome</h1>");
```

**Binary:**
```nv
ctx.data("image/png", image_data);
```

### Redirect

```nv
ctx.redirect(302, "/new-path");   // 302 Found
ctx.redirect(301, "/moved");      // 301 Moved Permanently
```

### Cookies

```nv
// Simple
ctx.set_cookie("theme", "dark");

// With options
ctx.set_cookie_with_options("session", token, CookieOptions {
    max_age: 86400,      // 1 day
    http_only: true,
    secure: true,
    same_site: "Strict",
    path: "/",
});
```

### Delete Cookie

```nv
ctx.delete_cookie("session");
```

## Complete Example

```nv
app.post("/api/login", func_handler(|ctx| {
    // Parse request
    let creds = try ctx.bind_json::<Credentials>();

    // Validate
    let user = authenticate(creds.email, creds.password);

    if (user == nil) {
        ctx.status(401);
        try ctx.json({"error": "Invalid credentials"});
        return;
    }

    // Generate token
    let token = generate_token(user!);

    // Set cookie
    ctx.set_cookie_with_options("auth", token, CookieOptions {
        http_only: true,
        secure: true,
        max_age: 3600,
    });

    // Response
    ctx.status(200);
    try ctx.json({
        "user": user!.name,
        "message": "Logged in"
    });
}));
```
