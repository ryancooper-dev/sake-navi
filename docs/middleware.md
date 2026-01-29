# Middleware

Middleware in Sake allows you to process requests before they reach your handlers and responses before they're sent to clients.

## Middleware Basics

A middleware is a function that takes a Context and can:
- Modify the request/response
- Execute code before/after the handler
- Short-circuit the request chain

```nv
fn my_middleware(): fn(ctx: Context) throws {
    return |ctx| {
        // Before handler
        println("Request started");

        try ctx.next();  // Call next handler

        // After handler
        println("Request completed");
    };
}
```

## Using Middleware

### Global Middleware

Applied to all routes:

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.default();

    // Add global middleware
    app.use(logger());
    app.use(recovery());

    app.get("/", |ctx| { /* ... */ });

    try app.run(":8080");
}
```

### Group Middleware

Applied to a route group:

```nv
let api = app.group("/api");
api.use(auth_middleware());

api.get("/users", |ctx| { /* requires auth */ });
api.get("/posts", |ctx| { /* requires auth */ });
```

### Route Middleware

Applied to a specific route:

```nv
app.get("/admin", |ctx| { /* ... */ })
    .use(auth_middleware())
    .use(admin_only());
```

## Built-in Middleware

### Logger

Logs request information:

```nv
use sake.middleware.logger.{logger, logger_with_config, LoggerConfig};

// Default logger
app.use(logger());

// Custom configuration
let config = LoggerConfig {
    format: "${method} ${path} ${status} ${latency}",
    skip_paths: ["/health", "/metrics"],
    use_colors: true,
};
app.use(logger_with_config(config));
```

### Recovery

Catches panics and returns 500 error:

```nv
use sake.middleware.recovery.{recovery, recovery_with_config, RecoveryConfig};

// Default recovery
app.use(recovery());

// With stack trace in development
let config = RecoveryConfig {
    show_details: true,
    show_stack: true,
};
app.use(recovery_with_config(config));
```

### CORS

Cross-Origin Resource Sharing:

```nv
use sake.middleware.cors.{cors, cors_with_config, CorsConfig};

// Allow all origins
app.use(cors());

// Custom configuration
let config = CorsConfig {
    allowed_origins: ["https://example.com", "https://api.example.com"],
    allowed_methods: ["GET", "POST", "PUT", "DELETE"],
    allowed_headers: ["Content-Type", "Authorization"],
    allow_credentials: true,
    max_age: 86400,
};
app.use(cors_with_config(config));
```

### Basic Auth

HTTP Basic Authentication:

```nv
use sake.middleware.basic_auth.{basic_auth, basic_auth_with_config, BasicAuthConfig};

// Simple auth
let accounts = {
    "admin": "secret123",
    "user": "password",
};
app.use(basic_auth(accounts));

// Custom configuration
let config = BasicAuthConfig {
    accounts: accounts,
    realm: "My API",
    unauthorized_message: "Invalid credentials",
};
app.use(basic_auth_with_config(config));
```

### Static Files

Serve static files:

```nv
use sake.middleware.static.{static_files, static_with_config, StaticConfig};

// Serve from ./public directory
app.use(static_files("/static", "./public"));

// Custom configuration
let config = StaticConfig {
    root: "./public",
    index_file: "index.html",
    enable_directory_listing: false,
};
app.get("/static/*filepath", static_with_config(config));
```

## Writing Custom Middleware

### Basic Pattern

```nv
fn timing_middleware(): fn(ctx: Context) throws {
    return |ctx| {
        let start = time.now();

        try ctx.next();

        let duration = time.now() - start;
        ctx.set_header("X-Response-Time", `${duration}ms`);
    };
}
```

### Authentication Middleware

```nv
fn auth_required(): fn(ctx: Context) throws {
    return |ctx| {
        let auth_header = ctx.header("authorization");

        if (auth_header == nil) {
            ctx.abort_with_status(401);
            return;
        }

        if (let token = auth_header) {
            if (!token.starts_with("Bearer ")) {
                ctx.abort_with_error(401, "Invalid token format");
                return;
            }

            let jwt = token.substring(7);
            // Validate JWT...

            ctx.set("user_id", user_id);
        }

        try ctx.next();
    };
}
```

### Rate Limiting Middleware

```nv
fn rate_limit(max_requests: int, window_seconds: int): fn(ctx: Context) throws {
    let requests: <string, [float]> = {:};

    return |ctx| {
        let client_ip = ctx.header("x-forwarded-for") || ctx.client_ip();
        let now = time.now();
        let window_start = now - window_seconds;

        // Get or create request history
        let history = requests.get(client_ip) || [];

        // Filter to current window
        let recent: [float] = [];
        for (let t in history) {
            if (t > window_start) {
                recent.push(t);
            }
        }

        if (recent.len() >= max_requests) {
            ctx.set_header("X-RateLimit-Limit", `${max_requests}`);
            ctx.set_header("X-RateLimit-Remaining", "0");
            ctx.abort_with_status(429);
            return;
        }

        recent.push(now);
        requests[client_ip] = recent;

        ctx.set_header("X-RateLimit-Limit", `${max_requests}`);
        ctx.set_header("X-RateLimit-Remaining", `${max_requests - recent.len()}`);

        try ctx.next();
    };
}
```

## Middleware Execution Order

Middleware executes in the order it's registered:

```nv
app.use(middleware_a());  // 1. Before
app.use(middleware_b());  // 2. Before
app.use(middleware_c());  // 3. Before

// Handler executes here

// Then after handlers in reverse:
// 3. After (middleware_c)
// 2. After (middleware_b)
// 1. After (middleware_a)
```

## Aborting Requests

Stop the middleware chain:

```nv
fn check_api_key(): fn(ctx: Context) throws {
    return |ctx| {
        let key = ctx.header("x-api-key");

        if (key == nil) {
            ctx.abort_with_error(401, "API key required");
            return;  // Don't call ctx.next()
        }

        try ctx.next();
    };
}
```

## Context Data Sharing

Pass data between middleware and handlers:

```nv
// In middleware
fn user_loader(): fn(ctx: Context) throws {
    return |ctx| {
        let user = load_user_from_token(ctx);
        ctx.set("current_user", user);
        try ctx.next();
    };
}

// In handler
app.get("/profile", |ctx| {
    let user = ctx.get("current_user");
    // Use user data...
});
```
