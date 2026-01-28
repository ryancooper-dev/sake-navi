# Contributing to Sake

First off, thank you for considering contributing to Sake! 🍶

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs **actual behavior**
- **Navi version** (`navi --version`)
- **Sake version**
- **OS and version**
- **Code samples** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear title** describing the suggestion
- **Provide detailed description** of the proposed functionality
- **Explain why** this enhancement would be useful
- **List any alternatives** you've considered

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main` for your feature/fix
3. **Write tests** for your changes
4. **Ensure tests pass** (`navi test`)
5. **Follow code style** (run `navi fmt`)
6. **Write clear commit messages** (see below)
7. **Update documentation** if needed
8. **Submit PR** with clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/sake-navi.git
cd sake-navi

# Install Navi (if not installed)
curl -sSL https://navi-lang.org/install | bash

# Run tests
navi test

# Format code
navi fmt
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```
feat(router): add wildcard route support
fix(context): handle nil body in JSON parsing
docs(readme): add installation instructions
test(middleware): add tests for CORS middleware
```

## Code Style

- Follow Navi conventions (`snake_case` for functions/variables, `CamelCase` for types)
- Use 4 spaces for indentation
- Add doc comments (`///`) for public APIs
- Keep functions focused and small
- Handle errors explicitly (prefer `try` over `try!`)

## Testing

- Write tests for new features
- Maintain or improve test coverage
- Test edge cases and error conditions

```bash
# Run all tests
navi test

# Run specific test file
navi test tests/router_test.nv

# Run doc tests
navi test --doc
```

## Documentation

- Update README.md for user-facing changes
- Update relevant docs/ files
- Add doc comments to public APIs
- Include code examples where helpful

## Release Process

Releases are managed by maintainers following [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking API changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Questions?

Feel free to open an issue with the `question` label or reach out to maintainers.

Thank you for contributing! 🎉
