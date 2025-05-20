import {
  buildEpicFeatureRelationships,
  buildFeatureStoryRelationships,
  buildFeatureEnablerRelationships
} from '../../src/planning/relationship-analyzer';
import { Epic, Feature, Story, Enabler } from '../../src/planning/models';

describe('Relationship Analyzer', () => {
  describe('buildEpicFeatureRelationships', () => {
    it('should associate features with epics by explicit ID', () => {
      const epics: Epic[] = [
        {
          id: 'epic1',
          type: 'epic',
          title: 'Authentication Epic',
          description: 'Epic for authentication features',
          attributes: {},
          features: []
        }
      ];
      
      const features: Feature[] = [
        {
          id: 'feature1',
          type: 'feature',
          title: 'Login Feature',
          description: 'Feature for user login',
          epicId: 'epic1',
          attributes: {},
          stories: [],
          enablers: []
        },
        {
          id: 'feature2',
          type: 'feature',
          title: 'Registration Feature',
          description: 'Feature for user registration',
          attributes: {},
          stories: [],
          enablers: []
        }
      ];
      
      const result = buildEpicFeatureRelationships(epics, features);
      
      expect(result.epics[0].features).toHaveLength(1);
      expect(result.epics[0].features[0].id).toBe('feature1');
      expect(result.orphanedFeatures).toHaveLength(1);
      expect(result.orphanedFeatures[0].id).toBe('feature2');
    });
    
    it('should associate features with epics by title mention', () => {
      const epics: Epic[] = [
        {
          id: 'epic1',
          type: 'epic',
          title: 'Authentication',
          description: 'Epic for authentication features',
          attributes: {},
          features: []
        }
      ];
      
      const features: Feature[] = [
        {
          id: 'feature1',
          type: 'feature',
          title: 'Login Feature',
          description: 'Part of the Authentication epic',
          attributes: {},
          stories: [],
          enablers: []
        },
        {
          id: 'feature2',
          type: 'feature',
          title: 'Registration Feature',
          description: 'Feature for user registration',
          attributes: {},
          stories: [],
          enablers: []
        }
      ];
      
      const result = buildEpicFeatureRelationships(epics, features);
      
      expect(result.epics[0].features).toHaveLength(1);
      expect(result.epics[0].features[0].id).toBe('feature1');
      expect(result.orphanedFeatures).toHaveLength(1);
      expect(result.orphanedFeatures[0].id).toBe('feature2');
    });
  });
  
  describe('buildFeatureStoryRelationships', () => {
    it('should associate stories with features by explicit ID', () => {
      const features: Feature[] = [
        {
          id: 'feature1',
          type: 'feature',
          title: 'Login Feature',
          description: 'Feature for user login',
          attributes: {},
          stories: [],
          enablers: []
        }
      ];
      
      const stories: Story[] = [
        {
          id: 'story1',
          type: 'story',
          title: 'User Login',
          description: 'Allow users to login',
          featureId: 'feature1',
          attributes: {},
          acceptanceCriteria: []
        },
        {
          id: 'story2',
          type: 'story',
          title: 'Password Reset',
          description: 'Allow users to reset password',
          attributes: {},
          acceptanceCriteria: []
        }
      ];
      
      const result = buildFeatureStoryRelationships(features, stories);
      
      expect(result.features[0].stories).toHaveLength(1);
      expect(result.features[0].stories[0].id).toBe('story1');
      expect(result.orphanedStories).toHaveLength(1);
      expect(result.orphanedStories[0].id).toBe('story2');
    });
    
    it('should associate stories with features by title mention', () => {
      const features: Feature[] = [
        {
          id: 'feature1',
          type: 'feature',
          title: 'Login',
          description: 'Feature for user login',
          attributes: {},
          stories: [],
          enablers: []
        }
      ];
      
      const stories: Story[] = [
        {
          id: 'story1',
          type: 'story',
          title: 'User Authentication',
          description: 'Part of the Login feature',
          attributes: {},
          acceptanceCriteria: []
        },
        {
          id: 'story2',
          type: 'story',
          title: 'Password Reset',
          description: 'Allow users to reset password',
          attributes: {},
          acceptanceCriteria: []
        }
      ];
      
      const result = buildFeatureStoryRelationships(features, stories);
      
      expect(result.features[0].stories).toHaveLength(1);
      expect(result.features[0].stories[0].id).toBe('story1');
      expect(result.orphanedStories).toHaveLength(1);
      expect(result.orphanedStories[0].id).toBe('story2');
    });
  });
  
  describe('buildFeatureEnablerRelationships', () => {
    it('should associate enablers with features by explicit ID', () => {
      const features: Feature[] = [
        {
          id: 'feature1',
          type: 'feature',
          title: 'Login Feature',
          description: 'Feature for user login',
          attributes: {},
          stories: [],
          enablers: []
        }
      ];
      
      const enablers: Enabler[] = [
        {
          id: 'enabler1',
          type: 'enabler',
          title: 'Authentication Service',
          description: 'Service for user authentication',
          featureId: 'feature1',
          attributes: {},
          enablerType: 'architecture'
        },
        {
          id: 'enabler2',
          type: 'enabler',
          title: 'CI/CD Pipeline',
          description: 'Continuous integration and deployment',
          attributes: {},
          enablerType: 'infrastructure'
        }
      ];
      
      const result = buildFeatureEnablerRelationships(features, enablers);
      
      expect(result.features[0].enablers).toHaveLength(1);
      expect(result.features[0].enablers[0].id).toBe('enabler1');
      expect(result.orphanedEnablers).toHaveLength(1);
      expect(result.orphanedEnablers[0].id).toBe('enabler2');
    });
    
    it('should associate enablers with features by title mention', () => {
      const features: Feature[] = [
        {
          id: 'feature1',
          type: 'feature',
          title: 'Login',
          description: 'Feature for user login',
          attributes: {},
          stories: [],
          enablers: []
        }
      ];
      
      const enablers: Enabler[] = [
        {
          id: 'enabler1',
          type: 'enabler',
          title: 'Authentication Service',
          description: 'Enabler for the Login feature',
          attributes: {},
          enablerType: 'architecture'
        },
        {
          id: 'enabler2',
          type: 'enabler',
          title: 'CI/CD Pipeline',
          description: 'Continuous integration and deployment',
          attributes: {},
          enablerType: 'infrastructure'
        }
      ];
      
      const result = buildFeatureEnablerRelationships(features, enablers);
      
      expect(result.features[0].enablers).toHaveLength(1);
      expect(result.features[0].enablers[0].id).toBe('enabler1');
      expect(result.orphanedEnablers).toHaveLength(1);
      expect(result.orphanedEnablers[0].id).toBe('enabler2');
    });
  });
});
