# Planning Information Extractor

This module extracts planning information from parsed Confluence documents. It identifies epics, features, stories, enablers, and their relationships.

## Overview

The Planning Information Extractor analyzes the structure and content of Confluence documents to identify SAFe planning items and their relationships. It provides a clean API for accessing the extracted planning information.

## Components

### Models

The `models.ts` file defines the data models for planning items:

- `PlanningItem`: Base interface for all planning items
- `Epic`: Represents a large body of work that can be broken down into features
- `Feature`: Represents a service that fulfills a stakeholder need
- `Story`: Represents a short description of a small piece of desired functionality
- `Enabler`: Represents an activity needed to extend the Architectural Runway
- `PlanningDocument`: Contains all planning items and their relationships

### Extractor

The `extractor.ts` file defines the main extractor class:

- `PlanningExtractor`: Extracts planning information from parsed Confluence documents

### Pattern Recognition

The `pattern-recognition.ts` file contains functions for recognizing different types of planning items:

- `isEpicSection`: Checks if a section represents an epic
- `isFeatureSection`: Checks if a section represents a feature
- `isStorySection`: Checks if a section represents a story
- `isEnablerSection`: Checks if a section represents an enabler
- `extractAcceptanceCriteria`: Extracts acceptance criteria from a section
- `extractStoryPoints`: Extracts story points from a section
- `extractAttributes`: Extracts attributes from a section

### Relationship Analyzer

The `relationship-analyzer.ts` file contains functions for analyzing relationships between planning items:

- `buildEpicFeatureRelationships`: Builds relationships between epics and features
- `buildFeatureStoryRelationships`: Builds relationships between features and stories
- `buildFeatureEnablerRelationships`: Builds relationships between features and enablers

### Structure Analyzer

The `structure-analyzer.ts` file contains functions for analyzing document structure:

- `identifyPlanningStructure`: Identifies planning structure in document sections
- `flattenDocumentStructure`: Flattens document structure
- `extractEpicsFromSections`: Extracts epics from document sections
- `extractFeaturesFromSections`: Extracts features from document sections
- `extractStoriesFromSections`: Extracts stories from document sections
- `extractEnablersFromSections`: Extracts enablers from document sections

## Usage

```typescript
import { PlanningExtractor } from './planning/extractor';

// Assuming you have parsed Confluence content and document sections
const extractor = new PlanningExtractor(parsedContent, documentSections);

// Get the planning document
const planningDocument = extractor.getPlanningDocument();

// Get all epics
const epics = extractor.getEpics();

// Get all features
const features = extractor.getFeatures();

// Get all stories
const stories = extractor.getStories();

// Get all enablers
const enablers = extractor.getEnablers();
```

## Dependencies

This module depends on the Parse Confluence Documents module, which provides the parsed Confluence content and document sections.

## Limitations

- The extractor relies on pattern recognition to identify planning items, which may not be 100% accurate
- The extractor assumes a certain document structure and may not work with all document formats
- The extractor may not identify all relationships between planning items, especially if they are not explicitly stated
