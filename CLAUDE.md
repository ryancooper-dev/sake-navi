# Navi-Web Development Guidelines

## Project Overview

Building a Gin-inspired web framework for the Navi programming language.

## Key Resources

### Navi Language Skill
Located at `.claude/skills/navi/SKILL.md` - **READ THIS FIRST** before writing any Navi code.

Key Navi features:
- `fn` for functions, `struct` + `impl` for types
- `T?` for optionals, `nil` for null
- `throws`/`try`/`try?`/`try!` for errors
- `spawn` + `channel` for concurrency (single-threaded!)
- `defer` for cleanup

### Project Files
- `specs/spec.md` - Feature specification
- `constitution.md` - Project principles and rules
- `.specify/` - Speckit templates and scripts

## Development Workflow

Use speckit commands in order:
1. `/speckit.constitution` - Review/update principles
2. `/speckit.specify` - Refine specification
3. `/speckit.plan` - Create implementation plan
4. `/speckit.tasks` - Generate task list
5. `/speckit.implement` - Execute implementation

## Code Guidelines

### Must Follow
- Read `.claude/skills/navi/SKILL.md` before coding
- Use Navi idioms (see skill file for syntax)
- All handlers: `|(ctx: Context)|` signature
- Use Optional types, never raw nil checks
- Use `defer` for cleanup
- Test all public APIs

### Avoid
- `try!` unless absolutely necessary
- Deep nesting (use early returns)
- Shared mutable state (use channels)
- Any dependencies outside std library

## Quality Assurance

### Mandatory Checks Before Committing

**CRITICAL**: Every code change MUST pass these checks:

1. **Compilation Check**
   ```bash
   ~/.navi/navi compile
   ```
   - MUST compile without errors
   - Fix all syntax errors immediately
   - Verify all imports are correct

2. **Test Execution**
   ```bash
   ~/.navi/navi test
   ```
   - ALL tests MUST pass
   - No skipped or failing tests allowed
   - Add tests for new features

### Navi Language Resources

When encountering Navi syntax issues, consult these resources **IN ORDER**:

1. **Navi Skill** (Local)
   - Location: `.claude/skills/navi/SKILL.md`
   - References: `.claude/skills/navi/references/*.md`
   - Quick reference for syntax, patterns, and idioms

2. **Navi GitHub Repository**
   - Syntax References: https://github.com/navi-language/navi/tree/main/.claude/skills/navi/references
   - Example Code: https://github.com/navi-language/navi/tree/main/.claude/skills/navi/examples
   - Official test suite examples

3. **Standard Library Documentation**
   - Documentation: https://navi-lang.org/stdlib/
   - API reference for std library modules
   - Usage examples for built-in functions

### Common Navi Syntax Issues

- **Module imports**: Use `use module.Type;` not `use module::Type;`
- **Error handling**: `try?` returns `nil` on error (for functions that throw)
- **Validation**: Functions that throw have no return value when using `try?`
- **Testing**: Use `test "name" { }` blocks inline or in separate test files
- **Module structure**: Files at project root become modules automatically

## File Structure

```
navi-web/
├── src/
│   ├── main.nv           # Entry point / example
│   ├── engine.nv         # Engine struct
│   ├── router.nv         # Router and routing
│   ├── context.nv        # Request context
│   ├── middleware/       # Built-in middleware
│   │   ├── logger.nv
│   │   ├── recovery.nv
│   │   └── cors.nv
│   └── http/             # HTTP parsing
│       ├── request.nv
│       └── response.nv
├── tests/
│   └── *.nv
├── examples/
│   └── *.nv
├── specs/
│   └── spec.md
├── constitution.md
└── README.md
```

## After Each Implementation Phase

Request Codex review with:
```
codex -m o3 "Review this Navi code for the navi-web framework. Check for:
1. Navi idioms and best practices
2. Error handling completeness
3. Type safety
4. Performance concerns
5. Documentation quality"
```
