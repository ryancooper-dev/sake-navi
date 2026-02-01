# Request

Access HTTP request data through Context methods.

## Properties

### Method

HTTP method (GET, POST, PUT, DELETE, etc.).

```nv
let method = ctx.method();  // "GET"
```

### Path

Request path without query string.

```nv
let path = ctx.path();  // "/users/123"
```

### URI

Full URI including query string.

```nv
let uri = ctx.uri();  // "/users/123?page=1"
```

### Headers

Get header by name (case-insensitive).

```nv
let content_type = ctx.header("Content-Type");
let auth = ctx.header("Authorization");
```

Get all headers as a map.

```nv
let headers = ctx.bind_header();
for (let name, value in headers) {
    println(`${name}: ${value}`);
}
```

### Body

Raw request body.

```nv
let body = ctx.body();
```

### Content Type

Get Content-Type header shortcut.

```nv
let content_type = ctx.content_type();
```

## Path Parameters

Get path parameter by name.

```nv
// Route: /users/:id
let id = ctx.param("id");  // "123" for /users/123
```

Get all path parameters.

```nv
let params = ctx.bind_uri();
```

## Query Parameters

Get query parameter by name.

```nv
// URL: /search?q=navi&limit=10
let q = ctx.query("q");           // "navi"?
let limit = ctx.query("limit");   // "10"?
```

Get query parameter with default value.

```nv
let page = ctx.default_query("page", "1");
```

Get all query parameters.

```nv
let params = ctx.bind_query();
```

## Body Parsing

### JSON

```nv
struct CreateUser {
    name: string,
    email: string,
}

let user = try ctx.bind_json::<CreateUser>();
```

### Form Data

```nv
let form = try ctx.bind_form();
let username = form.get("username");
```

## Cookies

Get cookie value by name.

```nv
let session = ctx.cookie("session_id");
```
