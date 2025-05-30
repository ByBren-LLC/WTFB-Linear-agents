# Confluence API Integration

This module provides integration with the Confluence API for the Linear Planning Agent. It enables the agent to read planning documents from Confluence and extract information for creating Linear issues.

## Features

- OAuth 2.0 authentication with Confluence
- Retrieving Confluence pages and attachments
- Searching for Confluence content using CQL
- Parsing Confluence documents into structured representations
- Analyzing document structure and extracting content
- Handling Confluence macros and formatting
- Converting Confluence content to Markdown
- Rate limiting to respect Confluence API limits
- Error handling and retry logic

## Usage

### Authentication

Before using the Confluence API, you need to authenticate with Confluence using OAuth 2.0. The authentication flow is handled by the `initiateConfluenceOAuth` and `handleConfluenceCallback` functions in `src/auth/confluence-oauth.ts`.

```typescript
import { initiateConfluenceOAuth, handleConfluenceCallback } from '../auth/confluence-oauth';

// In your Express app
app.get('/auth/confluence', initiateConfluenceOAuth);
app.get('/auth/confluence/callback', handleConfluenceCallback);
```

### Getting a Confluence Client

Once authenticated, you can get a Confluence client for an organization using the `getConfluenceClient` function:

```typescript
import { getConfluenceClient } from '../auth/confluence-oauth';

const client = await getConfluenceClient(organizationId);
if (!client) {
  // Handle authentication error
  return;
}
```

### Retrieving a Confluence Page

You can retrieve a Confluence page by ID or URL:

```typescript
// By ID
const page = await client.getPage('123456789');

// By URL
const page = await client.getPageByUrl('https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789');
```

### Searching for Confluence Content

You can search for Confluence content using CQL (Confluence Query Language):

```typescript
const results = await client.search('type=page AND space=SPACE AND title ~ "Planning"');
```

### Extracting Content from Confluence Pages

You can extract content from Confluence pages using the utility functions in `src/confluence/utils.ts`:

```typescript
import { extractPageContent, extractStructuredData, convertToMarkdown } from '../confluence/utils';

// Extract text content
const textContent = extractPageContent(page);

// Extract structured data (tables, lists, headings)
const structuredData = extractStructuredData(page);

// Convert to Markdown
const markdown = convertToMarkdown(page.body.storage.value);
```

### Parsing Confluence Documents

You can parse Confluence documents into structured representations using the `ConfluenceParser` class:

```typescript
import { ConfluenceParser } from '../confluence/parser';

// Create a parser with the storage format and title
const parser = new ConfluenceParser(page.body.storage.value, page.title);

// Parse the document
const document = parser.parse();
```

The parser is also integrated with the Confluence client:

```typescript
// Parse a page
const document = await client.parsePage('123456789');

// Parse a page by URL
const document = await client.parsePageByUrl('https://your-domain.atlassian.net/wiki/spaces/SPACE/pages/123456789');
```

### Analyzing Document Structure

You can analyze the structure of Confluence documents using the `StructureAnalyzer` class:

```typescript
import { StructureAnalyzer } from '../confluence/structure-analyzer';

// Create an analyzer with a parsed document
const analyzer = new StructureAnalyzer(document);

// Analyze the document structure
const structure = analyzer.analyze();

// Get the table of contents
const toc = analyzer.getTableOfContents(1, 3); // Levels 1-3

// Find sections by title
const sections = analyzer.findSectionsByTitle('Section Title');
```

The analyzer is also integrated with the Confluence client:

```typescript
// Analyze page structure
const structure = await client.analyzePageStructure('123456789');
```

### Extracting Content with ContentExtractor

You can extract content from parsed Confluence documents using the `ContentExtractor` class:

```typescript
import { ContentExtractor } from '../confluence/content-extractor';

// Create an extractor with a parsed document
const extractor = new ContentExtractor(document);

// Extract text content
const text = extractor.extractText();

// Extract headings
const headings = extractor.extractHeadings(1, 3); // Levels 1-3

// Search for text
const results = extractor.search('search text', {
  caseSensitive: false,
  wholeWord: true,
  includeHeadings: true,
  includeParagraphs: true
});
```

The extractor is also integrated with the Confluence client:

```typescript
// Extract page content
const extractor = await client.extractPageContent('123456789');
```

## Error Handling

The Confluence API client includes built-in error handling and retry logic for transient errors. You can also use the `handleConfluenceError` and `withRetry` functions from `src/confluence/error-handler.ts` for custom error handling:

```typescript
import { handleConfluenceError, withRetry } from '../confluence/error-handler';

try {
  // Make API call
} catch (error) {
  const handledError = handleConfluenceError(error);
  // Handle the error
}

// With retry
const result = await withRetry(
  () => client.getPage('123456789'),
  3, // Max retries
  1000 // Initial delay in milliseconds
);
```

## Rate Limiting

The Confluence API client includes built-in rate limiting to respect Confluence API limits. The default rate limit is 180 requests per minute, but you can customize it when creating the client:

```typescript
import { RateLimiter } from '../confluence/rate-limiter';

const rateLimiter = new RateLimiter(100); // 100 requests per minute
```

## Environment Variables

The Confluence API integration requires the following environment variables:

- `CONFLUENCE_CLIENT_ID`: The Confluence OAuth client ID
- `CONFLUENCE_CLIENT_SECRET`: The Confluence OAuth client secret
- `APP_URL`: The URL of your application (for OAuth callback)
- `ENCRYPTION_KEY`: The encryption key for storing tokens securely

## Database Schema

The Confluence API integration uses the following database table:

```sql
CREATE TABLE IF NOT EXISTS confluence_tokens (
  id SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  site_url TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id) REFERENCES linear_tokens(organization_id)
);
```
