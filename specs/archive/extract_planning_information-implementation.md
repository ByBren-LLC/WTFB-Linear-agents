# Extract Planning Information - Implementation Document

## Overview
This user story will implement the functionality to extract planning information from parsed Confluence documents. This component will analyze the document structure and content to identify epics, features, stories, enablers, and their relationships.

## User Story
As a Linear Planning Agent, I need to be able to extract planning information from Confluence documents so that I can create properly structured Linear issues.

## Acceptance Criteria
1. The agent can identify epics, features, stories, and enablers in a Confluence document
2. The agent can extract titles, descriptions, and other metadata for each work item
3. The agent can identify relationships between work items (parent-child)
4. The agent can extract acceptance criteria for stories
5. The agent can identify and extract story points or effort estimates
6. The agent can identify and extract labels, priorities, and other attributes
7. The agent can handle different document structures and formats
8. The agent provides a clean API for accessing extracted planning information
9. The implementation is well-tested with unit tests
10. The implementation is well-documented with JSDoc comments

## Technical Context
After parsing a Confluence document into a structured format, the Linear Planning Agent needs to analyze this structure to identify planning information. This involves recognizing patterns in the document that indicate different types of work items and their relationships.

### Existing Code
- `src/confluence/parser.ts`: Confluence document parser (to be implemented in the Parse Confluence Documents task)
- `src/confluence/structure-analyzer.ts`: Document structure analyzer (to be implemented in the Parse Confluence Documents task)

### Dependencies
- Parse Confluence Documents (User Story)
- SAFe Implementation in Linear (Spike)

## Implementation Plan

### 1. Define Planning Information Model
- Create a new file `src/planning/models.ts` for planning information models
- Define interfaces for epics, features, stories, and enablers
- Define interfaces for relationships and attributes

```typescript
// src/planning/models.ts
export interface PlanningItem {
  id: string;
  type: 'epic' | 'feature' | 'story' | 'enabler';
  title: string;
  description: string;
  parentId?: string;
  attributes: Record<string, any>;
}

export interface Epic extends PlanningItem {
  type: 'epic';
  features: Feature[];
}

export interface Feature extends PlanningItem {
  type: 'feature';
  epicId?: string;
  stories: Story[];
  enablers: Enabler[];
}

export interface Story extends PlanningItem {
  type: 'story';
  featureId?: string;
  acceptanceCriteria: string[];
  storyPoints?: number;
}

export interface Enabler extends PlanningItem {
  type: 'enabler';
  featureId?: string;
  enablerType: 'architecture' | 'infrastructure' | 'technical_debt' | 'research';
}

export interface PlanningDocument {
  title: string;
  epics: Epic[];
  orphanedFeatures: Feature[];
  orphanedStories: Story[];
  orphanedEnablers: Enabler[];
}
```

### 2. Implement Planning Information Extractor
- Create a new file `src/planning/extractor.ts` for the planning information extractor
- Implement a class that takes parsed Confluence content and extracts planning information
- Implement methods for accessing different types of planning items

```typescript
// src/planning/extractor.ts
import { ParsedElement } from '../confluence/parser';
import { DocumentSection } from '../confluence/structure-analyzer';
import { PlanningDocument, Epic, Feature, Story, Enabler } from './models';
import * as logger from '../utils/logger';

export class PlanningExtractor {
  private document: ParsedElement[];
  private sections: DocumentSection[];
  private planningDocument: PlanningDocument;

  constructor(document: ParsedElement[], sections: DocumentSection[]) {
    this.document = document;
    this.sections = sections;
    this.planningDocument = this.extractPlanningInformation();
  }

  private extractPlanningInformation(): PlanningDocument {
    // Implementation details
  }

  getPlanningDocument(): PlanningDocument {
    return this.planningDocument;
  }

  getEpics(): Epic[] {
    return this.planningDocument.epics;
  }

  getFeatures(): Feature[] {
    const features: Feature[] = [];
    
    // Collect features from epics
    this.planningDocument.epics.forEach(epic => {
      features.push(...epic.features);
    });
    
    // Add orphaned features
    features.push(...this.planningDocument.orphanedFeatures);
    
    return features;
  }

  getStories(): Story[] {
    const stories: Story[] = [];
    
    // Collect stories from features
    this.getFeatures().forEach(feature => {
      stories.push(...feature.stories);
    });
    
    // Add orphaned stories
    stories.push(...this.planningDocument.orphanedStories);
    
    return stories;
  }

  getEnablers(): Enabler[] {
    const enablers: Enabler[] = [];
    
    // Collect enablers from features
    this.getFeatures().forEach(feature => {
      enablers.push(...feature.enablers);
    });
    
    // Add orphaned enablers
    enablers.push(...this.planningDocument.orphanedEnablers);
    
    return enablers;
  }
}
```

### 3. Implement Pattern Recognition for Work Items
- Implement functions to recognize different types of work items
- Use headings, formatting, and content patterns to identify work items

```typescript
// src/planning/pattern-recognition.ts
import { ParsedElement } from '../confluence/parser';
import { DocumentSection } from '../confluence/structure-analyzer';

export const isEpicSection = (section: DocumentSection): boolean => {
  // Implementation details
};

export const isFeatureSection = (section: DocumentSection): boolean => {
  // Implementation details
};

export const isStorySection = (section: DocumentSection): boolean => {
  // Implementation details
};

export const isEnablerSection = (section: DocumentSection): boolean => {
  // Implementation details
};

export const extractAcceptanceCriteria = (section: DocumentSection): string[] => {
  // Implementation details
};

export const extractStoryPoints = (section: DocumentSection): number | undefined => {
  // Implementation details
};

export const extractAttributes = (section: DocumentSection): Record<string, any> => {
  // Implementation details
};
```

### 4. Implement Relationship Analyzer
- Implement functions to analyze relationships between work items
- Use document structure and content to identify parent-child relationships

```typescript
// src/planning/relationship-analyzer.ts
import { DocumentSection } from '../confluence/structure-analyzer';
import { Epic, Feature, Story, Enabler } from './models';

export const buildEpicFeatureRelationships = (
  epics: Epic[],
  features: Feature[]
): { epics: Epic[], orphanedFeatures: Feature[] } => {
  // Implementation details
};

export const buildFeatureStoryRelationships = (
  features: Feature[],
  stories: Story[]
): { features: Feature[], orphanedStories: Story[] } => {
  // Implementation details
};

export const buildFeatureEnablerRelationships = (
  features: Feature[],
  enablers: Enabler[]
): { features: Feature[], orphanedEnablers: Enabler[] } => {
  // Implementation details
};
```

### 5. Implement Document Structure Analysis
- Implement functions to analyze document structure for planning information
- Identify sections that contain planning information

```typescript
// src/planning/structure-analyzer.ts
import { DocumentSection } from '../confluence/structure-analyzer';
import { Epic, Feature, Story, Enabler } from './models';

export const identifyPlanningStructure = (sections: DocumentSection[]): {
  epicSections: DocumentSection[];
  featureSections: DocumentSection[];
  storySections: DocumentSection[];
  enablerSections: DocumentSection[];
} => {
  // Implementation details
};

export const extractEpicsFromSections = (sections: DocumentSection[]): Epic[] => {
  // Implementation details
};

export const extractFeaturesFromSections = (sections: DocumentSection[]): Feature[] => {
  // Implementation details
};

export const extractStoriesFromSections = (sections: DocumentSection[]): Story[] => {
  // Implementation details
};

export const extractEnablersFromSections = (sections: DocumentSection[]): Enabler[] => {
  // Implementation details
};
```

### 6. Write Tests
- Write unit tests for all components
- Write integration tests with real planning documents
- Test with various document structures and formats

```typescript
// tests/planning/extractor.test.ts
describe('PlanningExtractor', () => {
  // Test cases
});

// tests/planning/pattern-recognition.test.ts
describe('Pattern Recognition', () => {
  // Test cases
});

// tests/planning/relationship-analyzer.test.ts
describe('Relationship Analyzer', () => {
  // Test cases
});
```

### 7. Document the API
- Add JSDoc comments to all functions and classes
- Create a README.md file for the planning extractor
- Document usage examples and limitations

## Testing Approach
- Unit tests for all extractor components
- Integration tests with real planning documents
- Test with various document structures and formats
- Test with edge cases and malformed content

## Definition of Done
- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the planning extractor
- The implementation is reviewed and approved by the team

## Estimated Effort
- 5 story points (approximately 5 days of work)

## Resources
- [SAFe Documentation](https://www.scaledagileframework.com/)
- [Confluence Storage Format Documentation](https://developer.atlassian.com/cloud/confluence/confluence-storage-format/)
- [Linear API Documentation](https://developers.linear.app/docs/)
