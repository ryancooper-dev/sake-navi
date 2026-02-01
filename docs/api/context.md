# Context

Request context with access to request data and response methods.

## Request Data

### `param(name: string): string?`

Get path parameter.

```nv
// Route: /users/:id
let id = ctx.param("id");
```

### `query(name: string): string?`

Get query parameter.

```nv
// URL: /search?q=navi
let q = ctx.query("q");
```

### `header(name: string): string?`

Get request header.

```nv
let auth = ctx.header("Authorization");
```

### `body(): string`

Get raw request body.

```nv
let data = ctx.body();
```

### `bind_json<T>(): T`

Parse JSON body into struct.

```nv
let user = try ctx.bind_json::<User>();
```

### `cookie(name: string): string?`

Get cookie value.

```nv
let session = ctx.cookie("session_id");
```

## Response Methods

### `status(code: int)`

Set response status code.

```nv
ctx.status(201);
```

### `header(name: string, value: string)`

Set response header.

```nv
ctx.header("X-Custom", "value");
```

### `string(body: string)`

Send plain text response.

```nv
ctx.string("Hello");
```

### `json(data: T)`

Send JSON response.

```nv
try ctx.json({"status": "ok"});
```

### `html(body: string)`

Send HTML response.

```nv
ctx.html("<h1>Hello</h1>");
```

### `data(content_type: string, bytes: Bytes)`

Send binary response.

```nv
ctx.data("image/png", image_bytes);
```

### `redirect(url: string)`

Send 302 redirect.

```nv
try ctx.redirect("/new-path");
```

### `redirect_permanent(url: string)`

Send 301 redirect.

```nv
try ctx.redirect_permanent("/moved");
```

### `set_cookie(name: string, value: string)`

Set a cookie.

```nv
ctx.set_cookie("theme", "dark");
```

### `set_cookie_with_options(name, value, options)`

Set cookie with options.

```nv
ctx.set_cookie_with_options("session", token, CookieOptions {
    max_age: 3600,
    http_only: true,
    secure: true,
});
```

### `delete_cookie(name: string)`

Delete a cookie.

```nv
ctx.delete_cookie("session");
```

## Middleware

### `next()`

Continue to next handler in chain.

```nv
try ctx.next();
```

## Properties

### `request: Request`

The HTTP request object.

### `response: Response`

The HTTP response object.
