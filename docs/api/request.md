# Request

HTTP request object.

## Properties

### `method: string`

HTTP method (GET, POST, PUT, DELETE, etc.).

```nv
let method = ctx.request.method;  // "GET"
```

### `path: string`

Request path.

```nv
let path = ctx.request.path;  // "/users/123"
```

### `version: string`

HTTP version.

```nv
let version = ctx.request.version;  // "HTTP/1.1"
```

### `headers: <string, string>{}`

Request headers map.

```nv
for (let name, value in ctx.request.headers) {
    println(`${name}: ${value}`);
}
```

### `body: string`

Raw request body.

```nv
let body = ctx.request.body;
```

## Static Methods

### `Request.parse(raw: string): Request`

Parse raw HTTP request string.

```nv
let request = try Request.parse(raw_data);
```

## Helper Methods

### `header(name: string): string?`

Get header by name (case-insensitive).

```nv
let content_type = request.header("Content-Type");
```
