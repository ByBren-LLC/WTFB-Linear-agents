# Parameter Extraction Engine Design

## Overview

The Parameter Extraction Engine is responsible for extracting actionable parameters from parsed commands and enriching them with context from Linear issues. It bridges the gap between intent recognition (LIN-61) and command execution (LIN-63).

## Architecture

### Core Components

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Command Parser     │────▶│ Parameter Extractor  │────▶│  CLI Executor       │
│  (LIN-61)          │     │  (LIN-62)           │     │  (LIN-63)          │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                           │                              │
         │                           │                              │
    ParsedCommand              CommandParameters              CLIResult
    - intent                   - piId                        - success
    - normalizedText          - teamId                      - data
    - context                 - iterationId                 - error
                              - storyId
                              - timeframe
                              - explicit flags
```

### Key Interfaces

```typescript
export interface CommandParameters {
  // Planning Parameters
  piId?: string;              // Program Increment ID
  teamId?: string;            // Team identifier
  iterationId?: string;       // Sprint/Iteration ID
  
  // Story Parameters
  storyId?: string;           // Issue/Story ID
  storyPoints?: number;       // Story point estimate
  
  // Analysis Parameters
  timeframe?: TimeReference;  // Time period for analysis
  scope?: ScopeReference;     // Scope of analysis
  
  // Metadata
  explicit: {
    [key: string]: boolean;   // Track which params were explicit
  };
  
  // Validation
  validated?: boolean;        // Whether params passed validation
  validationErrors?: string[];
}

export interface TimeReference {
  type: 'current' | 'next' | 'previous' | 'specific';
  value?: string;             // For specific dates/periods
  resolved?: Date;            // Resolved date/time
}

export interface ScopeReference {
  type: 'team' | 'project' | 'epic' | 'workspace';
  id: string;
  name?: string;
}
```

## Extraction Strategies

### 1. Pattern-Based Extraction

Extract parameters using regex patterns specific to each intent:

```typescript
const EXTRACTION_PATTERNS = {
  PI_ID: /\bPI[-\s]?(\d{4}[-\s]?Q\d+|\w+[-\s]?\d+)\b/i,
  TEAM_ID: /\b(?:team|@)\s*([A-Za-z0-9-_]+)\b/i,
  ITERATION: /\b(?:iteration|sprint)\s*(\d+)\b/i,
  TIME_REF: /\b(this|current|next|previous|last)\s+(pi|sprint|iteration|quarter)\b/i,
  STORY_POINTS: /\b(\d+)\s*(?:points?|pts?)\b/i,
};
```

### 2. Context-Based Inference

Use issue context when parameters aren't explicitly provided:

```typescript
class ContextInference {
  inferTeamId(context: IssueContext): string | undefined {
    // 1. Check issue's team assignment
    // 2. Check assignee's default team
    // 3. Check project's default team
    return context.teamId || context.assignee?.teamId;
  }
  
  inferCurrentPI(context: IssueContext): string | undefined {
    // 1. Check issue labels for PI patterns
    // 2. Check current date against PI calendar
    // 3. Check parent epic's PI assignment
    return this.extractPIFromLabels(context.labels);
  }
}
```

### 3. Temporal Resolution

Resolve relative time references to absolute values:

```typescript
class TemporalResolver {
  resolve(timeRef: string, context: IssueContext): TimeReference {
    const now = new Date();
    
    switch (timeRef.toLowerCase()) {
      case 'this pi':
      case 'current pi':
        return {
          type: 'current',
          value: this.getCurrentPI(now),
          resolved: now
        };
        
      case 'next pi':
        return {
          type: 'next',
          value: this.getNextPI(now),
          resolved: this.addQuarter(now)
        };
        
      default:
        return { type: 'specific', value: timeRef };
    }
  }
}
```

## Parameter Validation

### Validation Pipeline

```typescript
class ParameterValidator {
  async validate(
    params: CommandParameters,
    intent: CommandIntent,
    linearClient: LinearClient
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // 1. Validate required parameters for intent
    const required = this.getRequiredParams(intent);
    for (const param of required) {
      if (!params[param]) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }
    
    // 2. Validate parameter values against Linear
    if (params.teamId) {
      const teamExists = await linearClient.teamExists(params.teamId);
      if (!teamExists) {
        errors.push(`Team not found: ${params.teamId}`);
      }
    }
    
    // 3. Validate parameter compatibility
    if (params.piId && params.iterationId) {
      const compatible = await this.validatePIIteration(
        params.piId, 
        params.iterationId
      );
      if (!compatible) {
        errors.push('Iteration does not belong to specified PI');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

## Integration Points

### With Command Parser (LIN-61)

```typescript
// Receives ParsedCommand
const parsed = commandParser.parse(text, context);

// Extracts parameters based on intent
const params = parameterExtractor.extract(
  parsed.normalizedText,
  parsed.intent,
  parsed.context
);
```

### With CLI Executor (LIN-63)

```typescript
// Provides validated CommandParameters
const validated = await validator.validate(params, intent);

if (validated.valid) {
  // Pass to CLI executor
  const result = await cliExecutor.execute(intent, params);
}
```

## Error Handling

### User-Friendly Error Messages

```typescript
class ParameterErrorFormatter {
  format(errors: string[]): string {
    if (errors.includes('Missing required parameter: piId')) {
      return "I need to know which PI to plan. Try:\n" +
             "• `@saafepulse plan PI-2025-Q1`\n" +
             "• `@saafepulse plan this PI`";
    }
    
    if (errors.includes('Team not found')) {
      return "I couldn't find that team. Available teams:\n" +
             "• Team Alpha\n" +
             "• Team Beta\n" +
             "• Team Gamma";
    }
    
    return errors.join('\n');
  }
}
```

## Performance Considerations

1. **Caching**: Cache Linear lookups (teams, PIs, iterations)
2. **Parallel Validation**: Validate independent parameters concurrently
3. **Early Exit**: Stop validation on first critical error
4. **Lazy Loading**: Only fetch Linear data when needed for validation

## Testing Strategy

### Unit Tests
- Pattern matching for each parameter type
- Context inference logic
- Temporal resolution accuracy
- Validation rules

### Integration Tests
- Full extraction pipeline with real commands
- Linear API validation
- Error message formatting
- Performance benchmarks

## Success Metrics

1. **Extraction Accuracy**: >90% for explicit parameters
2. **Context Utilization**: >80% successful inference rate
3. **Performance**: <50ms average extraction time
4. **User Satisfaction**: Clear error messages for missing/invalid params