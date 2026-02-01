# Response

Build HTTP responses through Context methods.

## Status Code

Set response status code.

```nv
ctx.status(200);  // OK
ctx.status(201);  // Created
ctx.status(404);  // Not Found
ctx.status(500);  // Internal Server Error
```

## Headers

Set response headers.

```nv
ctx.set_header("Content-Type", "text/plain");
ctx.set_header("X-Request-Id", request_id);
ctx.set_header("Cache-Control", "max-age=3600");
```

## Body

### Plain Text

```nv
ctx.string("Hello, World!");
```

### JSON

```nv
try ctx.json({
    "status": "ok",
    "data": items
});
```

### HTML

```nv
ctx.html("<h1>Welcome</h1>");
```

### XML

```nv
ctx.xml("<user><name>Alice</name></user>");
```

### YAML

```nv
ctx.yaml("name: Alice\nage: 30\n");
```

### Binary Data

```nv
ctx.data("image/png", image_data);
```

## File Responses

### Send File

```nv
try ctx.file("./static/image.png");
```

### Download

```nv
try ctx.download("./reports/data.csv", "report-2024.csv");
```

## Redirect

```nv
ctx.redirect(302, "/new-path");   // 302 Found
ctx.redirect(301, "/moved");      // 301 Moved Permanently
```

## Cookies

### Set Cookie

```nv
ctx.set_cookie("theme", "dark");
```

### Set Cookie with Options

```nv
ctx.set_cookie_advanced("session", token,
    86400,     // max_age: 1 day
    "/",       // path
    nil,       // domain
    true,      // secure
    true       // http_only
);
```

## Abort

### Stop Handler Chain

```nv
ctx.abort();
```

### Abort with Status

```nv
ctx.abort_with_status(401);
```

### Abort with Error

```nv
ctx.abort_with_error(404, "Resource not found");
```

## Complete Example

```nv
app.post("/api/users", func_handler(|ctx| {
    // Validate
    let ct = ctx.content_type() ?? "";
    if (!ct.contains("application/json")) {
        ctx.status(415);
        try ctx.json({"error": "Unsupported Media Type"});
        return;
    }

    // Process
    let user = try ctx.bind_json::<CreateUser>();
    let id = save_user(user);

    // Respond
    ctx.status(201);
    ctx.set_header("Location", `/api/users/${id}`);
    try ctx.json({"id": id, "created": true});
}));
```
