# Routing

## Basic Routes

```nv
app.get("/", handler);
app.post("/users", handler);
app.put("/users/:id", handler);
app.delete("/users/:id", handler);
app.patch("/users/:id", handler);
app.options("/users", handler);
app.head("/users", handler);
```

## Path Parameters

Capture dynamic segments:

```nv
app.get("/users/:id", |ctx| {
    let id = ctx.param("id");
    // ...
});

app.get("/posts/:post_id/comments/:comment_id", |ctx| {
    let post_id = ctx.param("post_id");
    let comment_id = ctx.param("comment_id");
    // ...
});
```

## Wildcards

Match any path suffix with `*`:

```nv
app.get("/static/*filepath", |ctx| {
    let path = ctx.param("filepath");
    // /static/css/main.css → path = "css/main.css"
});
```

## Route Groups

Organize routes with common prefixes:

```nv
let api = app.group("/api");
api.get("/users", get_users);      // GET /api/users
api.post("/users", create_user);   // POST /api/users

let v1 = api.group("/v1");
v1.get("/status", get_status);     // GET /api/v1/status
```

## Group Middleware

Apply middleware to a group:

```nv
let admin = app.group("/admin");
admin.add_middleware(auth_middleware);

admin.get("/dashboard", dashboard);   // Protected
admin.get("/settings", settings);     // Protected
```

## Any Method

Match all HTTP methods:

```nv
app.any("/ping", |ctx| {
    ctx.string("pong");
});
```
