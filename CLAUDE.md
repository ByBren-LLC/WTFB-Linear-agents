# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run the built application

### Testing

- `npm test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode

### CLI Operations

- `npm run cli` - Run the CLI with TypeScript directly
- `npm run cli:build` - Build CLI and make executable
- `npm run parse -- --confluence-url="URL"` - Parse Confluence document
- `npm run create -- --confluence-url="URL" --org-id="ID" --team-id="ID"` - Create Linear issues
- `npm run sync:start -- --org-id="ID" --team-id="ID" --confluence-url="URL"` - Start synchronization
- `npm run sync:status -- --org-id="ID" --team-id="ID" --confluence-url="URL"` - Check sync status
- `npm run sync:trigger -- --org-id="ID" --team-id="ID" --confluence-url="URL"` - Manual sync
- `npm run sync:stop -- --org-id="ID" --team-id="ID" --confluence-url="URL"` - Stop synchronization

### Docker

- `npm run docker:build` - Build Docker images
- `npm run docker:up` - Start containers
- `npm run docker:down` - Stop containers

## Architecture

### Core System Design

This is a Linear Planning Agent that integrates Linear with Confluence following SAFe methodology. The system has two main interfaces:

1. **CLI Tool**: Command-line interface for parsing, creating, and synchronizing
2. **Web Server**: Express app with OAuth, webhooks, and API endpoints

### Key Components

#### CLI Architecture (`src/cli/`)

- Main entry point: `src/cli/index.ts`
- Commands: parse, create, sync (start/stop/status/trigger)
- Uses Commander.js for argument parsing
- Outputs JSON for agent-to-agent workflows

#### Planning System (`src/planning/`)

- `extractor.ts` - Extracts planning data from Confluence documents
- `linear-issue-creator.ts` - Creates Linear issues from planning data
- `state-manager.ts` - Manages planning session state
- `process.ts` - Orchestrates the planning workflow
- `models.ts` - TypeScript interfaces for planning data

#### SAFe Hierarchy (`src/safe/`)

- Implements Scaled Agile Framework hierarchy: Epics → Features → Stories/Enablers
- `hierarchy-manager.ts` - Manages SAFe relationships in Linear
- `hierarchy-synchronizer.ts` - Syncs hierarchy changes
- `conflict-resolver.ts` - Resolves hierarchy conflicts
- `pi-planning.ts` - Program Increment planning support

#### Synchronization (`src/sync/`)

- `sync-manager.ts` - Orchestrates bidirectional sync between Linear and Confluence
- `change-detector.ts` - Detects changes in both systems
- `conflict-resolver.ts` - Resolves sync conflicts

#### Linear Integration (`src/linear/`)

- `client.ts` - Linear API client with retry and rate limiting
- `issue-creator.ts` - Creates issues following SAFe patterns
- `error-handler.ts` - Handles Linear API errors
- `rate-limiter.ts` - Rate limiting for Linear API

#### Confluence Integration (`src/confluence/`)

- `client.ts` - Confluence API client
- `parser.ts` - Parses Confluence documents for planning data
- `content-extractor.ts` - Extracts structured content
- `macro-handlers.ts` - Handles Confluence macros

#### Database (`src/db/`)

- Uses SQLite with migrations in `migrations/`
- `models.ts` - Database interfaces and operations
- `connection.ts` - Database connection management
- Schema includes: linear_tokens, confluence_tokens, planning_sessions, program_increments

#### Authentication (`src/auth/`)

- OAuth flows for both Linear and Confluence
- Token management and encryption
- Supports both CLI and web authentication

### Data Flow

1. **Parse**: Confluence document → PlanningDocument interface
2. **Create**: PlanningDocument → Linear issues with SAFe hierarchy
3. **Sync**: Bidirectional monitoring and conflict resolution

### Error Handling Patterns

- All modules use structured logging via `src/utils/logger.ts`
- Linear operations include retry logic with exponential backoff
- Rate limiting prevents API quota exhaustion
- Validation occurs at each stage of the pipeline

### Configuration

- Environment variables defined in `.env.template`
- Database migrations run automatically on startup
- Both local development and Docker deployment supported

## Development Notes

### Testing Full

- Tests located in `tests/` directory
- Uses Jest with ts-jest preset
- Coverage thresholds: 70% branches, 80% functions/lines/statements
- Run specific tests: `npx jest tests/specific-file.test.ts`

### Database Changes

- Create new migration files in `src/db/migrations/`
- Follow naming convention: `XXX_description.sql`
- Update `src/db/migrations/index.ts` to include new migrations

### Adding New CLI Commands

- Add commands in `src/cli/index.ts` using Commander.js patterns
- Add corresponding npm script in `package.json`
- Follow existing patterns for authentication and error handling

### SAFe Hierarchy Rules

- Epics contain Features
- Features contain Stories and/or Enablers
- Maintain parent-child relationships in Linear
- Use consistent labeling and issue types
