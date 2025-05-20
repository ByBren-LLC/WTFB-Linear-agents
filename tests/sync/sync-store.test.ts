import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SyncStore } from '../../src/sync/sync-store';
import { Conflict, Change, ChangeType, ChangeSource, ChangeItemType } from '../../src/sync/change-detector';
import { getDatabase } from '../../src/db/models';

// Mock dependencies
jest.mock('../../src/db/models');

describe('SyncStore', () => {
  let syncStore: SyncStore;
  let mockDb: any;

  const confluencePageIdOrUrl = 'page-id';
  const linearTeamId = 'team-id';
  const timestamp = Date.now();

  const linearChange: Change = {
    id: 'linear-1',
    type: ChangeType.UPDATED,
    source: ChangeSource.LINEAR,
    itemType: ChangeItemType.EPIC,
    itemId: 'item-1',
    itemData: { id: 'item-1', title: 'Linear Item 1' },
    timestamp
  };

  const confluenceChange: Change = {
    id: 'confluence-1',
    type: ChangeType.UPDATED,
    source: ChangeSource.CONFLUENCE,
    itemType: ChangeItemType.EPIC,
    itemId: 'item-1',
    itemData: { id: 'item-1', title: 'Confluence Item 1' },
    timestamp
  };

  const conflict: Conflict = {
    id: 'conflict-1',
    linearChange,
    confluenceChange,
    isResolved: false
  };

  const resolvedConflict: Conflict = {
    ...conflict,
    resolvedChange: {
      ...linearChange,
      id: 'resolved-1'
    },
    isResolved: true,
    resolutionStrategy: 'linear'
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockDb = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn()
    };
    (getDatabase as jest.Mock).mockResolvedValue(mockDb);

    // Create instance
    syncStore = new SyncStore();
  });

  describe('getLastSyncTimestamp', () => {
    it('should get last sync timestamp', async () => {
      // Arrange
      mockDb.get.mockResolvedValue({ timestamp });

      // Act
      const result = await syncStore.getLastSyncTimestamp(
        confluencePageIdOrUrl,
        linearTeamId
      );

      // Assert
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT timestamp FROM sync_state'),
        [confluencePageIdOrUrl, linearTeamId]
      );
      expect(result).toBe(timestamp);
    });

    it('should return null if no sync state found', async () => {
      // Arrange
      mockDb.get.mockResolvedValue(null);

      // Act
      const result = await syncStore.getLastSyncTimestamp(
        confluencePageIdOrUrl,
        linearTeamId
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.get.mockRejectedValue(error);

      // Act
      const result = await syncStore.getLastSyncTimestamp(
        confluencePageIdOrUrl,
        linearTeamId
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateLastSyncTimestamp', () => {
    it('should update last sync timestamp', async () => {
      // Act
      await syncStore.updateLastSyncTimestamp(
        confluencePageIdOrUrl,
        linearTeamId,
        timestamp
      );

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_state'),
        [confluencePageIdOrUrl, linearTeamId, timestamp, timestamp]
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.run.mockRejectedValue(error);

      // Act & Assert
      await expect(syncStore.updateLastSyncTimestamp(
        confluencePageIdOrUrl,
        linearTeamId,
        timestamp
      )).rejects.toThrow(error);
    });
  });

  describe('storeConflict', () => {
    it('should store conflict', async () => {
      // Act
      await syncStore.storeConflict(conflict);

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conflicts'),
        [
          conflict.id,
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          0,
          null,
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          0,
          null
        ]
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.run.mockRejectedValue(error);

      // Act & Assert
      await expect(syncStore.storeConflict(conflict)).rejects.toThrow(error);
    });
  });

  describe('storeResolvedConflict', () => {
    it('should store resolved conflict', async () => {
      // Act
      await syncStore.storeResolvedConflict(resolvedConflict);

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conflicts'),
        [
          resolvedConflict.id,
          JSON.stringify(resolvedConflict.linearChange),
          JSON.stringify(resolvedConflict.confluenceChange),
          1,
          resolvedConflict.resolutionStrategy,
          JSON.stringify(resolvedConflict.resolvedChange),
          JSON.stringify(resolvedConflict.linearChange),
          JSON.stringify(resolvedConflict.confluenceChange),
          1,
          resolvedConflict.resolutionStrategy,
          JSON.stringify(resolvedConflict.resolvedChange)
        ]
      );
    });

    it('should throw error if conflict is not resolved', async () => {
      // Act & Assert
      await expect(syncStore.storeResolvedConflict(conflict)).rejects.toThrow('Conflict is not resolved');
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.run.mockRejectedValue(error);

      // Act & Assert
      await expect(syncStore.storeResolvedConflict(resolvedConflict)).rejects.toThrow(error);
    });
  });

  describe('getUnresolvedConflicts', () => {
    it('should get unresolved conflicts', async () => {
      // Arrange
      mockDb.all.mockResolvedValue([
        {
          id: conflict.id,
          linear_change: JSON.stringify(conflict.linearChange),
          confluence_change: JSON.stringify(conflict.confluenceChange),
          is_resolved: 0,
          resolution_strategy: null
        }
      ]);

      // Act
      const result = await syncStore.getUnresolvedConflicts();

      // Assert
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM conflicts WHERE is_resolved = 0')
      );
      expect(result).toEqual([
        {
          id: conflict.id,
          linearChange: conflict.linearChange,
          confluenceChange: conflict.confluenceChange,
          isResolved: false,
          resolutionStrategy: null
        }
      ]);
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.all.mockRejectedValue(error);

      // Act
      const result = await syncStore.getUnresolvedConflicts();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getResolvedConflicts', () => {
    it('should get resolved conflicts', async () => {
      // Arrange
      mockDb.all.mockResolvedValue([
        {
          id: resolvedConflict.id,
          linear_change: JSON.stringify(resolvedConflict.linearChange),
          confluence_change: JSON.stringify(resolvedConflict.confluenceChange),
          is_resolved: 1,
          resolution_strategy: resolvedConflict.resolutionStrategy,
          resolved_change: JSON.stringify(resolvedConflict.resolvedChange)
        }
      ]);

      // Act
      const result = await syncStore.getResolvedConflicts();

      // Assert
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM conflicts WHERE is_resolved = 1')
      );
      expect(result).toEqual([
        {
          id: resolvedConflict.id,
          linearChange: resolvedConflict.linearChange,
          confluenceChange: resolvedConflict.confluenceChange,
          resolvedChange: resolvedConflict.resolvedChange,
          isResolved: true,
          resolutionStrategy: resolvedConflict.resolutionStrategy
        }
      ]);
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.all.mockRejectedValue(error);

      // Act
      const result = await syncStore.getResolvedConflicts();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getAllConflicts', () => {
    it('should get all conflicts', async () => {
      // Arrange
      mockDb.all.mockResolvedValue([
        {
          id: conflict.id,
          linear_change: JSON.stringify(conflict.linearChange),
          confluence_change: JSON.stringify(conflict.confluenceChange),
          is_resolved: 0,
          resolution_strategy: null,
          resolved_change: null
        },
        {
          id: resolvedConflict.id,
          linear_change: JSON.stringify(resolvedConflict.linearChange),
          confluence_change: JSON.stringify(resolvedConflict.confluenceChange),
          is_resolved: 1,
          resolution_strategy: resolvedConflict.resolutionStrategy,
          resolved_change: JSON.stringify(resolvedConflict.resolvedChange)
        }
      ]);

      // Act
      const result = await syncStore.getAllConflicts();

      // Assert
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM conflicts')
      );
      expect(result).toEqual([
        {
          id: conflict.id,
          linearChange: conflict.linearChange,
          confluenceChange: conflict.confluenceChange,
          isResolved: false,
          resolutionStrategy: null
        },
        {
          id: resolvedConflict.id,
          linearChange: resolvedConflict.linearChange,
          confluenceChange: resolvedConflict.confluenceChange,
          resolvedChange: resolvedConflict.resolvedChange,
          isResolved: true,
          resolutionStrategy: resolvedConflict.resolutionStrategy
        }
      ]);
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.all.mockRejectedValue(error);

      // Act
      const result = await syncStore.getAllConflicts();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('deleteConflict', () => {
    it('should delete conflict', async () => {
      // Act
      await syncStore.deleteConflict(conflict.id);

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM conflicts WHERE id = ?'),
        [conflict.id]
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.run.mockRejectedValue(error);

      // Act & Assert
      await expect(syncStore.deleteConflict(conflict.id)).rejects.toThrow(error);
    });
  });

  describe('clearConflicts', () => {
    it('should clear all conflicts', async () => {
      // Act
      await syncStore.clearConflicts();

      // Assert
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM conflicts')
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockDb.run.mockRejectedValue(error);

      // Act & Assert
      await expect(syncStore.clearConflicts()).rejects.toThrow(error);
    });
  });
});
