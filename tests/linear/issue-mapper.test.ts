import { describe, it, expect } from '@jest/globals';
import { 
  mapEpicToIssueInput, 
  mapFeatureToIssueInput, 
  mapStoryToIssueInput, 
  mapEnablerToIssueInput,
  mapPriorityToLinear,
  mapStoryPointsToEstimate,
  mapEnablerTypeToSAFe
} from '../../src/linear/issue-mapper';
import { Epic, Feature, Story, Enabler } from '../../src/planning/models';
import { EnablerType } from '../../src/safe/safe_linear_implementation';

describe('Issue Mapper', () => {
  const teamId = 'team-123';
  const labelIds = ['label-1', 'label-2'];

  describe('mapEpicToIssueInput', () => {
    it('should map an epic to a Linear issue input', async () => {
      const epic: Epic = {
        id: 'epic-1',
        title: 'Test Epic',
        description: 'Test Epic Description',
        attributes: {
          priority: 'high'
        }
      };

      const result = await mapEpicToIssueInput(epic, teamId, labelIds);

      expect(result).toEqual({
        teamId,
        title: '[EPIC] Test Epic',
        description: 'Test Epic Description',
        labelIds,
        priority: 2
      });
    });

    it('should handle epics without attributes', async () => {
      const epic: Epic = {
        id: 'epic-1',
        title: 'Test Epic',
        description: 'Test Epic Description'
      };

      const result = await mapEpicToIssueInput(epic, teamId, labelIds);

      expect(result).toEqual({
        teamId,
        title: '[EPIC] Test Epic',
        description: 'Test Epic Description',
        labelIds,
        priority: undefined
      });
    });
  });

  describe('mapFeatureToIssueInput', () => {
    it('should map a feature to a Linear issue input with parent epic', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test Feature',
        description: 'Test Feature Description',
        storyPoints: 8,
        attributes: {
          priority: 'medium'
        }
      };

      const epicId = 'epic-123';
      const result = await mapFeatureToIssueInput(feature, teamId, epicId, labelIds);

      expect(result).toEqual({
        teamId,
        title: '[FEATURE] Test Feature',
        description: 'Test Feature Description',
        labelIds,
        priority: 3,
        estimate: 8,
        parentId: epicId
      });
    });

    it('should map a feature to a Linear issue input without parent epic', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test Feature',
        description: 'Test Feature Description',
        storyPoints: 5,
        attributes: {
          priority: 'low'
        }
      };

      const result = await mapFeatureToIssueInput(feature, teamId, undefined, labelIds);

      expect(result).toEqual({
        teamId,
        title: '[FEATURE] Test Feature',
        description: 'Test Feature Description',
        labelIds,
        priority: 4,
        estimate: 5
      });
    });
  });

  describe('mapStoryToIssueInput', () => {
    it('should map a story to a Linear issue input with parent feature', async () => {
      const story: Story = {
        id: 'story-1',
        title: 'Test Story',
        description: 'Test Story Description',
        storyPoints: 3,
        acceptanceCriteria: [
          'Criteria 1',
          'Criteria 2'
        ],
        attributes: {
          priority: 'urgent'
        }
      };

      const featureId = 'feature-123';
      const result = await mapStoryToIssueInput(story, teamId, featureId, labelIds);

      expect(result).toEqual({
        teamId,
        title: 'Test Story',
        description: 'Test Story Description\n\n## Acceptance Criteria\n- [ ] Criteria 1\n- [ ] Criteria 2\n',
        labelIds,
        priority: 1,
        estimate: 3,
        parentId: featureId
      });
    });

    it('should map a story to a Linear issue input without parent feature', async () => {
      const story: Story = {
        id: 'story-1',
        title: 'Test Story',
        description: 'Test Story Description',
        storyPoints: 2
      };

      const result = await mapStoryToIssueInput(story, teamId, undefined, labelIds);

      expect(result).toEqual({
        teamId,
        title: 'Test Story',
        description: 'Test Story Description',
        labelIds,
        priority: undefined,
        estimate: 2
      });
    });
  });

  describe('mapEnablerToIssueInput', () => {
    it('should map an enabler to a Linear issue input with parent feature', async () => {
      const enabler: Enabler = {
        id: 'enabler-1',
        title: 'Test Enabler',
        description: 'Test Enabler Description',
        enablerType: 'architecture',
        storyPoints: 5,
        attributes: {
          priority: 'high'
        }
      };

      const featureId = 'feature-123';
      const result = await mapEnablerToIssueInput(enabler, teamId, featureId, labelIds);

      expect(result).toEqual({
        teamId,
        title: '[ENABLER] Test Enabler',
        description: 'Test Enabler Description',
        labelIds,
        priority: 2,
        estimate: 5,
        parentId: featureId
      });
    });

    it('should map an enabler to a Linear issue input without parent feature', async () => {
      const enabler: Enabler = {
        id: 'enabler-1',
        title: 'Test Enabler',
        description: 'Test Enabler Description',
        enablerType: 'technical debt',
        storyPoints: 13
      };

      const result = await mapEnablerToIssueInput(enabler, teamId, undefined, labelIds);

      expect(result).toEqual({
        teamId,
        title: '[ENABLER] Test Enabler',
        description: 'Test Enabler Description',
        labelIds,
        priority: undefined,
        estimate: 13
      });
    });
  });

  describe('mapPriorityToLinear', () => {
    it('should map priority strings to Linear priority numbers', () => {
      expect(mapPriorityToLinear('urgent')).toBe(1);
      expect(mapPriorityToLinear('critical')).toBe(1);
      expect(mapPriorityToLinear('high')).toBe(2);
      expect(mapPriorityToLinear('medium')).toBe(3);
      expect(mapPriorityToLinear('normal')).toBe(3);
      expect(mapPriorityToLinear('low')).toBe(4);
      expect(mapPriorityToLinear('unknown')).toBeUndefined();
      expect(mapPriorityToLinear(undefined)).toBeUndefined();
    });
  });

  describe('mapStoryPointsToEstimate', () => {
    it('should map story points to the closest Linear estimate', () => {
      expect(mapStoryPointsToEstimate(1)).toBe(1);
      expect(mapStoryPointsToEstimate(2)).toBe(2);
      expect(mapStoryPointsToEstimate(3)).toBe(3);
      expect(mapStoryPointsToEstimate(4)).toBe(3);
      expect(mapStoryPointsToEstimate(5)).toBe(5);
      expect(mapStoryPointsToEstimate(6)).toBe(5);
      expect(mapStoryPointsToEstimate(7)).toBe(8);
      expect(mapStoryPointsToEstimate(8)).toBe(8);
      expect(mapStoryPointsToEstimate(10)).toBe(8);
      expect(mapStoryPointsToEstimate(13)).toBe(13);
      expect(mapStoryPointsToEstimate(20)).toBe(13);
      expect(mapStoryPointsToEstimate(undefined)).toBeUndefined();
    });
  });

  describe('mapEnablerTypeToSAFe', () => {
    it('should map enabler type strings to SAFe EnablerType', () => {
      expect(mapEnablerTypeToSAFe('architecture')).toBe(EnablerType.ARCHITECTURE);
      expect(mapEnablerTypeToSAFe('architectural')).toBe(EnablerType.ARCHITECTURE);
      expect(mapEnablerTypeToSAFe('infrastructure')).toBe(EnablerType.INFRASTRUCTURE);
      expect(mapEnablerTypeToSAFe('technical debt')).toBe(EnablerType.TECHNICAL_DEBT);
      expect(mapEnablerTypeToSAFe('debt')).toBe(EnablerType.TECHNICAL_DEBT);
      expect(mapEnablerTypeToSAFe('research')).toBe(EnablerType.RESEARCH);
      expect(mapEnablerTypeToSAFe('exploration')).toBe(EnablerType.RESEARCH);
      expect(mapEnablerTypeToSAFe('spike')).toBe(EnablerType.RESEARCH);
      expect(mapEnablerTypeToSAFe('unknown')).toBe(EnablerType.TECHNICAL_DEBT);
      expect(mapEnablerTypeToSAFe(undefined)).toBe(EnablerType.TECHNICAL_DEBT);
    });
  });
});
