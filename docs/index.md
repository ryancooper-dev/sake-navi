---
layout: home

hero:
  name: Web framework for Navi
  text: ""
  tagline: Simple. Fast. Refined.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/pnowak-dev/sake-navi

features:
  - icon:
      src: /icons/fast.svg
    title: Fast
    details: 45,000+ requests per second with Keep-Alive. Built on Navi's async I/O.
  - icon:
      src: /icons/simple.svg
    title: Simple
    details: Gin-inspired API. If you know Gin, you know Sake.
  - icon:
      src: /icons/concurrent.svg
    title: Concurrent
    details: spawn for I/O-bound, WorkerPool for CPU-bound. Choose per route.
  - icon:
      src: /icons/typesafe.svg
    title: Type-Safe
    details: Full Navi type safety. Optional types, no null pointer exceptions.
  - icon:
      src: /icons/middleware.svg
    title: Middleware
    details: Composable middleware chain with ctx.next().
  - icon:
      src: /icons/batteries.svg
    title: Batteries Included
    details: JSON, cookies, path params, query strings, form data.
---

<div class="subtle-divider"></div>

<div style="max-width: 680px; margin: 0 auto; padding: 0 24px;">

```nv
use sake.{Engine, func_handler};

fn main() throws {
    let app = Engine.with_defaults();

    app.get("/", func_handler(|ctx| {
        ctx.string("Hello, Sake.");
    }));

    app.get("/api/users/:id", func_handler(|ctx| {
        let id = ctx.param("id");
        try? ctx.json({"id": id});
    }));

    try app.run(":8080");
}
```

<div class="perf-badge">
  <span>⚡</span>
  <span><strong>45,000+</strong> req/sec</span>
</div>

</div>
