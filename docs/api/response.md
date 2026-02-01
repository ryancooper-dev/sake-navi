# Response

HTTP response builder.

## Constructor

### `Response.new()`

Create empty response.

```nv
let response = Response.new();
```

### `Response.not_found()`

Create 404 response.

```nv
let response = Response.not_found();
```

## Methods

### `status(code: int)`

Set status code.

```nv
response.status(200);
response.status(201);
response.status(404);
```

### `header(name: string, value: string)`

Set response header.

```nv
response.header("Content-Type", "application/json");
response.header("Cache-Control", "no-cache");
```

### `write(body: string)`

Set response body.

```nv
response.write("{\"status\": \"ok\"}");
```

### `build(): string`

Build complete HTTP response string.

```nv
let http_response = response.build();
// "HTTP/1.1 200 OK\r\nContent-Type: ...\r\n\r\n{...}"
```

### `send(stream: Connection)`

Send response to connection.

```nv
try response.send(stream);
```

## Properties

### `status_code: int`

Current status code.

```nv
let code = response.status_code;  // 200
```

### `headers: <string, string>{}`

Response headers map.
