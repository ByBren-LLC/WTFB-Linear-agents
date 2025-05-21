# CLAUDE.md - Guidelines for Claude GitHub Actions

## Project Overview

The WTFB-Linear-agents project implements Linear.app agents for SAFe Essentials Implementation. It provides tools for automating planning, synchronization, and management of Linear issues based on SAFe methodology.

## Architectural Principles

1. **Modular Design**: Each component should have a single responsibility and clear interfaces.
2. **Separation of Concerns**: Keep different aspects of the system (API, business logic, data access) separate.
3. **API-First Design**: Design APIs before implementation, with clear contracts.
4. **Stateless Services**: Services should be stateless where possible to enable scaling.
5. **Event-Driven Architecture**: Use events for communication between components when appropriate.
6. **Idempotent Operations**: Operations should be idempotent to allow for retries.

## Code Standards

### JavaScript/TypeScript

1. **Formatting**: Use Prettier with the project's configuration.
2. **Linting**: Follow ESLint rules defined in the project.
3. **Naming Conventions**:
   - Use camelCase for variables and functions
   - Use PascalCase for classes and interfaces
   - Use UPPER_SNAKE_CASE for constants
4. **Documentation**: Use JSDoc comments for all public APIs.
5. **Error Handling**: Use try/catch blocks and proper error propagation.
6. **Async/Await**: Prefer async/await over raw promises.
7. **Type Safety**: Use TypeScript types and interfaces for all code.

### Testing

1. **Unit Tests**: All business logic should have unit tests.
2. **Integration Tests**: API endpoints should have integration tests.
3. **Test Coverage**: Aim for at least 80% test coverage.
4. **Test Naming**: Tests should be named descriptively.

## PR Review Criteria

When reviewing PRs, focus on:

1. **Architectural Alignment**: Does the code follow the architectural principles?
2. **Code Quality**: Is the code well-written, maintainable, and efficient?
3. **Test Coverage**: Are there sufficient tests for the changes?
4. **Documentation**: Is the code well-documented?
5. **Security**: Are there any security concerns?
6. **Performance**: Are there any performance concerns?
7. **Compatibility**: Does it maintain compatibility with the Linear API?
8. **SAFe Alignment**: Does it align with SAFe Essentials methodology?

## Branch and PR Guidelines

1. **Branch Naming**:
   - Feature branches: `feature/short-description`
   - Bug fixes: `fix/short-description`
   - Technical enablers: `enabler/short-description`
   - Spikes: `spike/short-description`

2. **PR Titles**:
   - Start with the type: `[Feature]`, `[Fix]`, `[Enabler]`, or `[Spike]`
   - Include a brief description
   - Reference Linear issue: `LIN-XX`

3. **PR Descriptions**:
   - Summarize the changes
   - Explain the rationale
   - List any dependencies
   - Include testing instructions
   - Reference related Linear issues

4. **PR Labels**:
   - Use appropriate labels: `feature`, `bug`, `enabler`, `spike`, `documentation`

## Linear Issue References

When referencing Linear issues, use the format `LIN-XX` where XX is the issue number.

## File Structure

The project follows this structure:

- `src/`: Source code
  - `api/`: API endpoints
  - `auth/`: Authentication logic
  - `cli/`: Command-line interface
  - `confluence/`: Confluence integration
  - `db/`: Database access
  - `linear/`: Linear API integration
  - `planning/`: Planning logic
  - `sync/`: Synchronization logic
  - `utils/`: Utility functions
- `tests/`: Tests
- `scripts/`: Utility scripts
- `specs/`: Specification documents
- `docs/`: Documentation

## Dependencies

Be cautious when adding new dependencies. Prefer:

1. Using existing dependencies
2. Using small, focused packages
3. Packages with good maintenance history
4. Packages with TypeScript support

## Security Considerations

1. **API Keys**: Never hardcode API keys or secrets.
2. **Input Validation**: Always validate user input.
3. **Rate Limiting**: Respect API rate limits.
4. **Error Messages**: Don't expose sensitive information in error messages.

## Performance Considerations

1. **Batch Operations**: Use batch operations when possible.
2. **Caching**: Use caching for expensive operations.
3. **Pagination**: Use pagination for large data sets.
4. **Async Operations**: Use async operations for I/O-bound tasks.

## SAFe Essentials Alignment

Ensure all code changes align with SAFe Essentials methodology:

1. **Traceability**: Maintain traceability between code and requirements.
2. **Definition of Done**: Ensure all changes meet the Definition of Done.
3. **Incremental Delivery**: Support incremental delivery of features.
4. **Built-in Quality**: Incorporate quality practices throughout development.

## Off-Limits Areas

Do not modify:

1. **Configuration Files**: `.env.example`, `package.json`, etc. without explicit permission.
2. **CI/CD Configuration**: GitHub Actions workflows not related to Claude.
3. **License Files**: `LICENSE`, etc.
4. **Third-Party Code**: Code in `vendor/` or similar directories.

## When to Escalate

Escalate to a human reviewer when:

1. **Architectural Changes**: Changes that affect the overall architecture.
2. **Security Concerns**: Potential security vulnerabilities.
3. **Breaking Changes**: Changes that break backward compatibility.
4. **Complex Algorithms**: Implementation of complex algorithms.
5. **Performance Critical Code**: Code that is performance-critical.

## Contact Information

For questions or concerns, contact:

- Scott Graham (scott@wordstofilmby.com) - Project Owner
