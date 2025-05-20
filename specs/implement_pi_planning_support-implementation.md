# Implement PI Planning Support - Implementation Document

## Overview
This spike will research and implement support for Program Increment (PI) Planning in the Linear Planning Agent. This is a critical component of SAFe methodology that will enable the agent to organize work into time-boxed planning intervals.

## User Story
As a Linear Planning Agent, I need to support Program Increment (PI) Planning so that I can organize work into time-boxed planning intervals according to SAFe methodology.

## Acceptance Criteria
1. The agent can create Program Increments in Linear
2. The agent can assign features to Program Increments
3. The agent can track Program Increment progress
4. The agent can identify and extract PI information from Confluence documents
5. The agent can visualize Program Increments in the UI
6. The agent provides a clean API for PI Planning
7. The implementation is well-tested with unit tests
8. The implementation is well-documented with JSDoc comments

## Technical Context
Program Increment (PI) Planning is a key component of SAFe methodology. It involves organizing work into time-boxed planning intervals, typically 8-12 weeks long, that provide a development cadence for Agile Release Trains (ARTs). The Linear Planning Agent needs to support PI Planning to fully implement SAFe methodology.

### Existing Code
- `src/safe/safe_linear_implementation.ts`: SAFe implementation in Linear
- `src/planning/models.ts`: Planning information models

### Dependencies
- SAFe Implementation in Linear (Spike)
- Create Linear Issues from Planning Data (User Story)
- Maintain SAFe Hierarchy (User Story)

## Implementation Plan

### 1. Research PI Planning in SAFe
- Research PI Planning in SAFe methodology
- Identify key concepts and requirements
- Document findings and recommendations

```markdown
# PI Planning in SAFe

## Key Concepts
- Program Increments (PIs) are time-boxed planning intervals, typically 8-12 weeks long
- PIs include PI Planning, Execution Iterations, Innovation and Planning (IP) Iteration, System Demo, and Retrospective
- PI Planning is a face-to-face event where teams plan the next PI
- Features are assigned to PIs during PI Planning
- Teams break down features into stories and plan their work for the PI

## Requirements for Linear Implementation
- Represent PIs in Linear
- Assign features to PIs
- Track PI progress
- Visualize PIs in the UI
- Extract PI information from Confluence documents

## Recommendations
- Use Linear Cycles to represent PIs
- Use Linear Projects to represent ARTs
- Use Linear Labels to identify PI-related issues
- Use Linear Roadmap to visualize PIs
```

### 2. Implement PI Model
- Create a new file `src/safe/pi-model.ts` for PI models
- Define interfaces for PIs and related concepts

```typescript
// src/safe/pi-model.ts
export interface ProgramIncrement {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  features: string[]; // Feature IDs
  status: 'planning' | 'execution' | 'completed';
}

export interface PIPlanning {
  id: string;
  piId: string;
  startDate: Date;
  endDate: Date;
  teams: string[]; // Team IDs
  features: string[]; // Feature IDs
  status: 'planning' | 'completed';
}

export interface PIIteration {
  id: string;
  piId: string;
  number: number;
  startDate: Date;
  endDate: Date;
  isInnovationAndPlanning: boolean;
  stories: string[]; // Story IDs
}

export interface PIFeature {
  id: string;
  piId: string;
  featureId: string;
  teamId: string;
  status: 'planned' | 'in-progress' | 'completed';
  confidence: 1 | 2 | 3 | 4 | 5;
  dependencies: string[]; // Feature IDs
}
```

### 3. Implement PI Manager
- Create a new file `src/safe/pi-manager.ts` for the PI manager
- Implement a class that manages PIs in Linear

```typescript
// src/safe/pi-manager.ts
import { LinearClient, Cycle } from '@linear/sdk';
import * as logger from '../utils/logger';
import { ProgramIncrement, PIFeature } from './pi-model';
import { SAFeLinearImplementation } from './safe_linear_implementation';

export class PIManager {
  private linearClient: LinearClient;
  private safeImplementation: SAFeLinearImplementation;
  private teamId: string;

  constructor(accessToken: string, teamId: string) {
    this.linearClient = new LinearClient({ accessToken });
    this.safeImplementation = new SAFeLinearImplementation(accessToken);
    this.teamId = teamId;
  }

  async createProgramIncrement(
    name: string,
    startDate: Date,
    endDate: Date,
    description?: string
  ): Promise<ProgramIncrement> {
    try {
      // Create a cycle in Linear to represent the PI
      const cycle = await this.safeImplementation.createProgramIncrement(
        this.teamId,
        name,
        startDate,
        endDate,
        description
      );

      // Create a PI object
      const pi: ProgramIncrement = {
        id: cycle.id,
        name: cycle.name,
        startDate: new Date(cycle.startsAt),
        endDate: new Date(cycle.endsAt),
        description: cycle.description || undefined,
        features: [],
        status: 'planning'
      };

      logger.info('Created Program Increment', { pi });

      return pi;
    } catch (error) {
      logger.error('Error creating Program Increment', { error, name });
      throw error;
    }
  }

  async getProgramIncrements(): Promise<ProgramIncrement[]> {
    try {
      // Get all cycles that represent PIs
      const cycles = await this.safeImplementation.getProgramIncrements(this.teamId);

      // Convert cycles to PIs
      const pis: ProgramIncrement[] = await Promise.all(
        cycles.map(async cycle => {
          // Get features assigned to this PI
          const features = await this.getFeaturesForPI(cycle.id);

          return {
            id: cycle.id,
            name: cycle.name,
            startDate: new Date(cycle.startsAt),
            endDate: new Date(cycle.endsAt),
            description: cycle.description || undefined,
            features: features.map(f => f.featureId),
            status: this.getPIStatus(cycle)
          };
        })
      );

      return pis;
    } catch (error) {
      logger.error('Error getting Program Increments', { error, teamId: this.teamId });
      throw error;
    }
  }

  async getCurrentProgramIncrement(): Promise<ProgramIncrement | null> {
    try {
      // Get the current cycle that represents a PI
      const cycle = await this.safeImplementation.getCurrentProgramIncrement(this.teamId);

      if (!cycle) {
        return null;
      }

      // Get features assigned to this PI
      const features = await this.getFeaturesForPI(cycle.id);

      // Convert cycle to PI
      const pi: ProgramIncrement = {
        id: cycle.id,
        name: cycle.name,
        startDate: new Date(cycle.startsAt),
        endDate: new Date(cycle.endsAt),
        description: cycle.description || undefined,
        features: features.map(f => f.featureId),
        status: this.getPIStatus(cycle)
      };

      return pi;
    } catch (error) {
      logger.error('Error getting current Program Increment', { error, teamId: this.teamId });
      throw error;
    }
  }

  async assignFeatureToPI(
    piId: string,
    featureId: string,
    teamId: string
  ): Promise<PIFeature> {
    try {
      // Assign the feature to the PI in Linear
      await this.safeImplementation.assignFeaturesToPI(piId, [featureId]);

      // Create a PIFeature object
      const piFeature: PIFeature = {
        id: `${piId}-${featureId}`,
        piId,
        featureId,
        teamId,
        status: 'planned',
        confidence: 3,
        dependencies: []
      };

      logger.info('Assigned feature to PI', { piId, featureId });

      return piFeature;
    } catch (error) {
      logger.error('Error assigning feature to PI', { error, piId, featureId });
      throw error;
    }
  }

  async getFeaturesForPI(piId: string): Promise<PIFeature[]> {
    try {
      // Get all issues assigned to this cycle that are features
      const issues = await this.linearClient.issues({
        filter: {
          cycle: { id: { eq: piId } },
          labels: { name: { eq: 'Feature' } }
        }
      });

      // Convert issues to PIFeatures
      const piFeatures: PIFeature[] = issues.nodes.map(issue => ({
        id: `${piId}-${issue.id}`,
        piId,
        featureId: issue.id,
        teamId: issue.team.id,
        status: this.getFeatureStatus(issue.state.name),
        confidence: 3, // Default confidence
        dependencies: [] // Dependencies would need to be extracted from issue relationships
      }));

      return piFeatures;
    } catch (error) {
      logger.error('Error getting features for PI', { error, piId });
      throw error;
    }
  }

  private getPIStatus(cycle: Cycle): 'planning' | 'execution' | 'completed' {
    const now = new Date();
    const startDate = new Date(cycle.startsAt);
    const endDate = new Date(cycle.endsAt);

    if (now < startDate) {
      return 'planning';
    } else if (now <= endDate) {
      return 'execution';
    } else {
      return 'completed';
    }
  }

  private getFeatureStatus(stateName: string): 'planned' | 'in-progress' | 'completed' {
    // Map Linear state names to PI feature statuses
    const stateMap: Record<string, 'planned' | 'in-progress' | 'completed'> = {
      'Backlog': 'planned',
      'Todo': 'planned',
      'In Progress': 'in-progress',
      'In Review': 'in-progress',
      'Done': 'completed',
      'Canceled': 'completed'
    };

    return stateMap[stateName] || 'planned';
  }
}
```

### 4. Implement PI Extractor
- Create a new file `src/planning/pi-extractor.ts` for the PI extractor
- Implement a class that extracts PI information from Confluence documents

```typescript
// src/planning/pi-extractor.ts
import { ParsedElement } from '../confluence/parser';
import { DocumentSection } from '../confluence/structure-analyzer';
import { ProgramIncrement } from '../safe/pi-model';
import * as logger from '../utils/logger';

export class PIExtractor {
  private document: ParsedElement[];
  private sections: DocumentSection[];

  constructor(document: ParsedElement[], sections: DocumentSection[]) {
    this.document = document;
    this.sections = sections;
  }

  extractProgramIncrements(): ProgramIncrement[] {
    try {
      const pis: ProgramIncrement[] = [];

      // Look for PI sections in the document
      const piSections = this.findPISections();

      for (const section of piSections) {
        // Extract PI information from the section
        const pi = this.extractPIFromSection(section);
        
        if (pi) {
          pis.push(pi);
        }
      }

      return pis;
    } catch (error) {
      logger.error('Error extracting Program Increments', { error });
      return [];
    }
  }

  private findPISections(): DocumentSection[] {
    // Implementation details
    return [];
  }

  private extractPIFromSection(section: DocumentSection): ProgramIncrement | null {
    // Implementation details
    return null;
  }

  private extractDateRange(text: string): { startDate: Date; endDate: Date } | null {
    // Implementation details
    return null;
  }

  private extractFeatureIds(section: DocumentSection): string[] {
    // Implementation details
    return [];
  }
}
```

### 5. Implement PI Planning UI
- Create a new file `src/ui/pages/PIPlanning.tsx` for the PI Planning UI
- Implement a page for creating and managing PIs

```typescript
// src/ui/pages/PIPlanning.tsx
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DatePicker } from '../components/DatePicker';
import { FeatureList } from '../components/FeatureList';
import { createProgramIncrement, getProgramIncrements, assignFeatureToPI } from '../api/pi';

export const PIPlanning: React.FC = () => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [pis, setPIs] = useState<any[]>([]);
  const [selectedPI, setSelectedPI] = useState<string | null>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const history = useHistory();

  useEffect(() => {
    const fetchPIs = async () => {
      try {
        const data = await getProgramIncrements(user?.organizationId || '');
        setPIs(data);
      } catch (error) {
        showToast(`Error loading Program Increments: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPIs();
  }, [user, showToast]);

  const handleCreatePI = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !startDate || !endDate) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const pi = await createProgramIncrement({
        name,
        startDate,
        endDate,
        description,
        organizationId: user?.organizationId || ''
      });
      
      setPIs([...pis, pi]);
      setSelectedPI(pi.id);
      showToast('Program Increment created successfully', 'success');
      
      // Reset form
      setName('');
      setStartDate(null);
      setEndDate(null);
      setDescription('');
    } catch (error) {
      showToast(`Error creating Program Increment: ${error.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignFeature = async (featureId: string) => {
    if (!selectedPI) {
      showToast('Please select a Program Increment', 'error');
      return;
    }
    
    try {
      await assignFeatureToPI({
        piId: selectedPI,
        featureId,
        teamId: user?.teamId || '',
        organizationId: user?.organizationId || ''
      });
      
      showToast('Feature assigned to Program Increment', 'success');
      
      // Refresh PIs
      const data = await getProgramIncrements(user?.organizationId || '');
      setPIs(data);
    } catch (error) {
      showToast(`Error assigning feature to Program Increment: ${error.message}`, 'error');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="pi-planning-page">
      <h1>Program Increment Planning</h1>
      
      <div className="pi-planning-container">
        <div className="pi-list">
          <h2>Program Increments</h2>
          
          {pis.length === 0 ? (
            <div className="empty-state">
              <p>No Program Increments found.</p>
              <p>Create a new Program Increment to get started.</p>
            </div>
          ) : (
            <ul>
              {pis.map(pi => (
                <li
                  key={pi.id}
                  className={`pi-item ${selectedPI === pi.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPI(pi.id)}
                >
                  <div className="pi-name">{pi.name}</div>
                  <div className="pi-dates">
                    {new Date(pi.startDate).toLocaleDateString()} - {new Date(pi.endDate).toLocaleDateString()}
                  </div>
                  <div className="pi-status">{pi.status}</div>
                </li>
              ))}
            </ul>
          )}
          
          <h3>Create New Program Increment</h3>
          
          <form onSubmit={handleCreatePI}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for this Program Increment"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="startDate">Start Date</label>
              <DatePicker
                id="startDate"
                selected={startDate}
                onChange={setStartDate}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <DatePicker
                id="endDate"
                selected={endDate}
                onChange={setEndDate}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description for this Program Increment"
              />
            </div>
            
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Program Increment'}
            </Button>
          </form>
        </div>
        
        <div className="feature-list">
          <h2>Features</h2>
          
          {selectedPI ? (
            <FeatureList
              features={features}
              onAssign={handleAssignFeature}
              assignedFeatures={pis.find(pi => pi.id === selectedPI)?.features || []}
            />
          ) : (
            <div className="empty-state">
              <p>Select a Program Increment to assign features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 6. Implement PI API
- Create a new file `src/api/pi.ts` for the PI API
- Implement functions for interacting with the PI API

```typescript
// src/api/pi.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const createProgramIncrement = async (data: {
  name: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  organizationId: string;
}) => {
  const response = await api.post('/pi', data);
  return response.data;
};

export const getProgramIncrements = async (organizationId: string) => {
  const response = await api.get('/pi', {
    params: { organizationId }
  });
  return response.data;
};

export const getCurrentProgramIncrement = async (organizationId: string) => {
  const response = await api.get('/pi/current', {
    params: { organizationId }
  });
  return response.data;
};

export const assignFeatureToPI = async (data: {
  piId: string;
  featureId: string;
  teamId: string;
  organizationId: string;
}) => {
  const response = await api.post(`/pi/${data.piId}/features`, data);
  return response.data;
};

export const getFeaturesForPI = async (piId: string) => {
  const response = await api.get(`/pi/${piId}/features`);
  return response.data;
};
```

### 7. Write Tests
- Write unit tests for all components
- Write integration tests for the PI Planning functionality
- Test with various scenarios and edge cases

```typescript
// tests/safe/pi-manager.test.ts
import { PIManager } from '../../src/safe/pi-manager';
import { LinearClient } from '@linear/sdk';
import { SAFeLinearImplementation } from '../../src/safe/safe_linear_implementation';

// Mock the Linear client and SAFe implementation
jest.mock('@linear/sdk');
jest.mock('../../src/safe/safe_linear_implementation');

describe('PIManager', () => {
  // Test cases
});

// tests/planning/pi-extractor.test.ts
import { PIExtractor } from '../../src/planning/pi-extractor';
import { ParsedElement } from '../../src/confluence/parser';
import { DocumentSection } from '../../src/confluence/structure-analyzer';

describe('PIExtractor', () => {
  // Test cases
});
```

### 8. Document the API
- Add JSDoc comments to all functions and classes
- Create a README.md file for the PI Planning functionality
- Document usage examples and limitations

## Testing Approach
- Unit tests for all components
- Integration tests for the PI Planning functionality
- Test with various scenarios and edge cases
- Test with real Linear and Confluence instances

## Definition of Done
- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the PI Planning functionality
- The implementation is reviewed and approved by the team

## Estimated Effort
- 5 story points (approximately 5 days of work)

## Resources
- [SAFe PI Planning Documentation](https://www.scaledagileframework.com/pi-planning/)
- [Linear API Documentation](https://developers.linear.app/docs/)
- [Linear SDK Documentation](https://github.com/linear/linear/tree/master/packages/sdk)
