# Confluence Parser

This module provides functionality to parse Confluence documents from their storage format (XHTML-based) into a structured format that can be easily processed by the Linear Planning Agent.

## Overview

The Confluence Parser is designed to:

1. Parse Confluence HTML content into a structured format
2. Identify headings, paragraphs, lists, tables, and other common elements
3. Extract text content from these elements
4. Identify and extract links, images, and other embedded content
5. Handle Confluence macros and custom content
6. Handle Confluence's storage format (XHTML-based)
7. Provide a clean API for accessing parsed content

## Usage

### Basic Usage

```typescript
import { ConfluenceParser } from './confluence/parser';

// Create a new parser instance with Confluence storage format
const parser = new ConfluenceParser(confluenceStorageFormat);

// Get the full content of the document
const content = parser.getFullContent();

// Get all headings in the document
const headings = parser.getHeadings();

// Get all paragraphs in the document
const paragraphs = parser.getParagraphs();

// Get all tables in the document
const tables = parser.getTables();

// Get all lists in the document
const lists = parser.getLists();

// Get all links in the document
const links = parser.getLinks();

// Get all images in the document
const images = parser.getImages();

// Get all macros in the document
const macros = parser.getMacros();
```

### Analyzing Document Structure

```typescript
import { ConfluenceParser } from './confluence/parser';
import { analyzeDocumentStructure, flattenDocumentStructure } from './confluence/structure-analyzer';

// Create a new parser instance with Confluence storage format
const parser = new ConfluenceParser(confluenceStorageFormat);

// Get the full content of the document
const content = parser.getFullContent();

// Analyze the document structure
const structure = analyzeDocumentStructure(content);

// Flatten the document structure
const flatStructure = flattenDocumentStructure(structure);
```

### Extracting Content

```typescript
import { ConfluenceParser } from './confluence/parser';
import { extractText, extractTextFromElements, findElementsByType, findElementsByContent } from './confluence/content-extractor';

// Create a new parser instance with Confluence storage format
const parser = new ConfluenceParser(confluenceStorageFormat);

// Get the full content of the document
const content = parser.getFullContent();

// Extract text from a specific element
const text = extractText(content[0]);

// Extract text from all elements
const allText = extractTextFromElements(content);

// Find elements by type
const paragraphs = findElementsByType(content, 'p');

// Find elements by content
const elementsWithKeyword = findElementsByContent(content, 'keyword');
```

## API Reference

### ConfluenceParser

The main parser class for Confluence documents.

#### Methods

- `getHeadings()`: Gets all headings in the document
- `getParagraphs()`: Gets all paragraphs in the document
- `getTables()`: Gets all tables in the document
- `getLists()`: Gets all lists in the document
- `getLinks()`: Gets all links in the document
- `getImages()`: Gets all images in the document
- `getMacros()`: Gets all macros in the document
- `getFullContent()`: Gets the full content of the document

### Structure Analyzer

Functions for analyzing document structure.

- `analyzeDocumentStructure(document)`: Analyzes the structure of a document
- `flattenDocumentStructure(sections)`: Flattens a hierarchical document structure

### Content Extractor

Functions for extracting content from parsed elements.

- `extractText(element)`: Extracts plain text from a parsed element
- `extractTextFromElements(elements)`: Extracts plain text from an array of parsed elements
- `findElementsByType(elements, type)`: Finds elements by type
- `findElementsByContent(elements, content, options)`: Finds elements by content
- `findElementsByAttribute(elements, attributeName, attributeValue, options)`: Finds elements by attribute
- `extractSummary(elements, maxLength)`: Extracts a summary from a document

## Limitations

- The parser may not handle all Confluence macros correctly, especially custom macros
- The parser may not handle all Confluence storage format features
- The parser does not handle Confluence attachments
- The parser does not handle Confluence comments
- The parser does not handle Confluence page properties
