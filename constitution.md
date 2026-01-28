# Sake Project Constitution

> **Sake** (清酒) - Navi's Web Framework

## Core Principles

### 1. Navi-Idiomatic Design
- Use Navi's Optional types (`T?`) for nullable values, never use sentinel values
- Use `throws`/`try`/`try?`/`try!` for error handling, not return codes
- Use `defer` for resource cleanup
- Use `spawn` + `channel` for concurrency
- Use `struct` + `impl` pattern, not classes

### 2. Simplicity Over Cleverness
- Prefer explicit over implicit behavior
- Keep the API surface small and focused
- One obvious way to do things
- No magic, no hidden state

### 3. Type Safety
- Leverage Navi's static typing fully
- Use specific types over `any` where possible
- Use enums for finite sets of values
- Compile-time errors over runtime errors

### 4. Performance by Default
- Zero-cost abstractions where possible
- Avoid unnecessary allocations
- Efficient routing (radix tree or similar)
- Don't pay for what you don't use

## Code Style

### Naming Conventions
- `snake_case` for functions, variables, fields
- `CamelCase` for types, structs, enums
- `SCREAMING_SNAKE_CASE` for constants
- Descriptive names over abbreviations

### Documentation
- All public APIs must have doc comments (`///`)
- Include usage examples in doc comments
- Document error conditions and edge cases

### Testing
- Unit tests for all public functions
- Integration tests for HTTP handling
- Doc tests for examples
- Test error paths, not just happy paths

## Architecture Decisions

### AD-001: Single-File Core
The core framework should be implementable in a single file for initial version, then split into modules as it grows.

### AD-002: No Dependencies
Core framework has no external dependencies. Only Navi standard library.

### AD-003: Handler Signature
All handlers use the signature `|(ctx: Context)|` for consistency and middleware compatibility.

### AD-004: Context as Single Source
The Context object is the single interface for request/response handling. No direct access to raw request/response in handlers.

### AD-005: Middleware Pattern
Use functional middleware pattern with explicit `ctx.next()` calls, not automatic chaining.

## Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Each commit should be atomic and buildable
- Write clear commit messages explaining "why"

## Review Checklist

Before merging any code:
- [ ] Follows Navi idioms
- [ ] Has doc comments
- [ ] Has tests
- [ ] No compiler warnings
- [ ] Handles errors properly (no `try!` without justification)
