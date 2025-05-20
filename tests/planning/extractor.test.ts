import { PlanningExtractor } from '../../src/planning/extractor';

// Mock ParsedElement and DocumentSection interfaces
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

// Mock the structure-analyzer and relationship-analyzer modules
jest.mock('../../src/planning/structure-analyzer', () => ({
  identifyPlanningStructure: jest.fn().mockReturnValue({
    epicSections: [{ title: 'Epic: Authentication', level: 1, content: [], subsections: [] }],
    featureSections: [{ title: 'Feature: Login', level: 2, content: [], subsections: [] }],
    storySections: [{ title: 'Story: User Login', level: 3, content: [], subsections: [] }],
    enablerSections: [{ title: 'Enabler: Authentication Service', level: 3, content: [], subsections: [] }]
  }),
  extractEpicsFromSections: jest.fn().mockReturnValue([
    { id: 'epic1', type: 'epic', title: 'Epic: Authentication', description: 'Epic for authentication', attributes: {}, features: [] }
  ]),
  extractFeaturesFromSections: jest.fn().mockReturnValue([
    { id: 'feature1', type: 'feature', title: 'Feature: Login', description: 'Feature for login', attributes: {}, stories: [], enablers: [] }
  ]),
  extractStoriesFromSections: jest.fn().mockReturnValue([
    { id: 'story1', type: 'story', title: 'Story: User Login', description: 'Story for login', attributes: {}, acceptanceCriteria: [], storyPoints: 3 }
  ]),
  extractEnablersFromSections: jest.fn().mockReturnValue([
    { id: 'enabler1', type: 'enabler', title: 'Enabler: Authentication Service', description: 'Enabler for authentication', attributes: {}, enablerType: 'architecture' }
  ])
}));

jest.mock('../../src/planning/relationship-analyzer', () => ({
  buildEpicFeatureRelationships: jest.fn().mockReturnValue({
    epics: [
      { 
        id: 'epic1', 
        type: 'epic', 
        title: 'Epic: Authentication', 
        description: 'Epic for authentication', 
        attributes: {}, 
        features: [
          { id: 'feature1', type: 'feature', title: 'Feature: Login', description: 'Feature for login', attributes: {}, epicId: 'epic1', stories: [], enablers: [] }
        ] 
      }
    ],
    orphanedFeatures: []
  }),
  buildFeatureStoryRelationships: jest.fn().mockReturnValue({
    features: [
      { 
        id: 'feature1', 
        type: 'feature', 
        title: 'Feature: Login', 
        description: 'Feature for login', 
        attributes: {}, 
        epicId: 'epic1', 
        stories: [
          { id: 'story1', type: 'story', title: 'Story: User Login', description: 'Story for login', attributes: {}, featureId: 'feature1', acceptanceCriteria: [], storyPoints: 3 }
        ],
        enablers: []
      }
    ],
    orphanedStories: []
  }),
  buildFeatureEnablerRelationships: jest.fn().mockReturnValue({
    features: [
      { 
        id: 'feature1', 
        type: 'feature', 
        title: 'Feature: Login', 
        description: 'Feature for login', 
        attributes: {}, 
        epicId: 'epic1', 
        stories: [
          { id: 'story1', type: 'story', title: 'Story: User Login', description: 'Story for login', attributes: {}, featureId: 'feature1', acceptanceCriteria: [], storyPoints: 3 }
        ],
        enablers: [
          { id: 'enabler1', type: 'enabler', title: 'Enabler: Authentication Service', description: 'Enabler for authentication', attributes: {}, featureId: 'feature1', enablerType: 'architecture' }
        ]
      }
    ],
    orphanedEnablers: []
  })
}));

describe('PlanningExtractor', () => {
  const mockDocument: ParsedElement[] = [
    { 
      type: 'heading', 
      content: 'Authentication Planning Document',
      attributes: { level: '1' }
    }
  ];
  
  const mockSections: DocumentSection[] = [
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
            },
            {
              title: 'Enabler: Authentication Service',
              level: 3,
              content: [],
              subsections: []
            }
          ]
        }
      ]
    }
  ];
  
  let extractor: PlanningExtractor;
  
  beforeEach(() => {
    extractor = new PlanningExtractor(mockDocument, mockSections);
  });
  
  describe('getPlanningDocument', () => {
    it('should return the planning document', () => {
      const planningDocument = extractor.getPlanningDocument();
      
      expect(planningDocument).toBeDefined();
      expect(planningDocument.title).toBe('Authentication Planning Document');
      expect(planningDocument.epics).toHaveLength(1);
      expect(planningDocument.orphanedFeatures).toHaveLength(0);
      expect(planningDocument.orphanedStories).toHaveLength(0);
      expect(planningDocument.orphanedEnablers).toHaveLength(0);
    });
  });
  
  describe('getEpics', () => {
    it('should return all epics', () => {
      const epics = extractor.getEpics();
      
      expect(epics).toHaveLength(1);
      expect(epics[0].title).toBe('Epic: Authentication');
    });
  });
  
  describe('getFeatures', () => {
    it('should return all features', () => {
      const features = extractor.getFeatures();
      
      expect(features).toHaveLength(1);
      expect(features[0].title).toBe('Feature: Login');
    });
  });
  
  describe('getStories', () => {
    it('should return all stories', () => {
      const stories = extractor.getStories();
      
      expect(stories).toHaveLength(1);
      expect(stories[0].title).toBe('Story: User Login');
    });
  });
  
  describe('getEnablers', () => {
    it('should return all enablers', () => {
      const enablers = extractor.getEnablers();
      
      expect(enablers).toHaveLength(1);
      expect(enablers[0].title).toBe('Enabler: Authentication Service');
    });
  });
});
