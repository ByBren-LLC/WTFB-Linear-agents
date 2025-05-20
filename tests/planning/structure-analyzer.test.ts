import {
  identifyPlanningStructure,
  flattenDocumentStructure,
  extractEpicsFromSections,
  extractFeaturesFromSections,
  extractStoriesFromSections,
  extractEnablersFromSections
} from '../../src/planning/structure-analyzer';

// Mock DocumentSection interface
interface ParsedElement {
  type: string;
  content: string | ParsedElement[];
  attributes?: Record<string, string>;
}

interface DocumentSection {
  title: string;
  level: number;
  content: ParsedElement[];
  subsections: DocumentSection[];
}

describe('Structure Analyzer', () => {
  describe('flattenDocumentStructure', () => {
    it('should flatten a nested document structure', () => {
      const sections: DocumentSection[] = [
        {
          title: 'Epic: Authentication',
          level: 1,
          content: [],
          subsections: [
            {
              title: 'Feature: Login',
              level: 2,
              content: [],
              subsections: [
                {
                  title: 'Story: User Login',
                  level: 3,
                  content: [],
                  subsections: []
                }
              ]
            }
          ]
        }
      ];
      
      const flattened = flattenDocumentStructure(sections);
      
      expect(flattened).toHaveLength(3);
      expect(flattened[0].title).toBe('Epic: Authentication');
      expect(flattened[1].title).toBe('Feature: Login');
      expect(flattened[2].title).toBe('Story: User Login');
    });
  });
  
  describe('identifyPlanningStructure', () => {
    it('should identify planning structure in document sections', () => {
      const sections: DocumentSection[] = [
        {
          title: 'Epic: Authentication',
          level: 1,
          content: [],
          subsections: []
        },
        {
          title: 'Feature: Login',
          level: 2,
          content: [],
          subsections: []
        },
        {
          title: 'Story: User Login',
          level: 3,
          content: [],
          subsections: []
        },
        {
          title: 'Enabler: Authentication Service',
          level: 3,
          content: [],
          subsections: []
        }
      ];
      
      const structure = identifyPlanningStructure(sections);
      
      expect(structure.epicSections).toHaveLength(1);
      expect(structure.featureSections).toHaveLength(1);
      expect(structure.storySections).toHaveLength(1);
      expect(structure.enablerSections).toHaveLength(1);
    });
  });
  
  describe('extractEpicsFromSections', () => {
    it('should extract epics from sections', () => {
      const sections: DocumentSection[] = [
        {
          title: 'Epic: Authentication',
          level: 1,
          content: [{ type: 'paragraph', content: 'Epic for authentication features' }],
          subsections: []
        }
      ];
      
      const epics = extractEpicsFromSections(sections);
      
      expect(epics).toHaveLength(1);
      expect(epics[0].title).toBe('Epic: Authentication');
      expect(epics[0].type).toBe('epic');
    });
  });
  
  describe('extractFeaturesFromSections', () => {
    it('should extract features from sections', () => {
      const sections: DocumentSection[] = [
        {
          title: 'Feature: Login',
          level: 2,
          content: [{ type: 'paragraph', content: 'Feature for user login' }],
          subsections: []
        }
      ];
      
      const features = extractFeaturesFromSections(sections);
      
      expect(features).toHaveLength(1);
      expect(features[0].title).toBe('Feature: Login');
      expect(features[0].type).toBe('feature');
    });
  });
  
  describe('extractStoriesFromSections', () => {
    it('should extract stories from sections', () => {
      const sections: DocumentSection[] = [
        {
          title: 'Story: User Login',
          level: 3,
          content: [
            { type: 'paragraph', content: 'Story for user login' },
            { type: 'paragraph', content: 'Acceptance Criteria:' },
            { 
              type: 'list', 
              content: [
                { type: 'listItem', content: 'User should be able to login with valid credentials' }
              ]
            },
            { type: 'paragraph', content: 'Story Points: 3' }
          ],
          subsections: []
        }
      ];
      
      const stories = extractStoriesFromSections(sections);
      
      expect(stories).toHaveLength(1);
      expect(stories[0].title).toBe('Story: User Login');
      expect(stories[0].type).toBe('story');
    });
  });
  
  describe('extractEnablersFromSections', () => {
    it('should extract enablers from sections', () => {
      const sections: DocumentSection[] = [
        {
          title: 'Enabler: Authentication Service',
          level: 3,
          content: [{ type: 'paragraph', content: 'Architecture enabler for authentication' }],
          subsections: []
        }
      ];
      
      const enablers = extractEnablersFromSections(sections);
      
      expect(enablers).toHaveLength(1);
      expect(enablers[0].title).toBe('Enabler: Authentication Service');
      expect(enablers[0].type).toBe('enabler');
      expect(enablers[0].enablerType).toBe('architecture');
    });
  });
});
