# Installation

## Requirements

- [Navi](https://navi-lang.org) 0.16 or higher

## Add Dependency

Add Sake to your `navi.toml`:

```toml
[dependencies]
sake = "0.1"
```

## Verify Installation

Create a minimal server:

```nv
use sake.Engine;

fn main() throws {
    let app = Engine.default();

    app.get("/", |ctx| {
        ctx.string("It works.");
    });

    try app.run(":8080");
}
```

Run:

```bash
navi run main.nv
```

You should see:

```
🍶 Sake Framework
==================
Server address: :8080
...
🍶 Server ready at :8080
```
