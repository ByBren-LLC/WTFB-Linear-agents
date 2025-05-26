import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SyncStore } from '../../src/sync/sync-store';
import { Conflict, Change, ChangeType, ChangeSource, ChangeItemType } from '../../src/sync/change-detector';
import { query } from '../../src/db/connection';

// Mock dependencies
jest.mock('../../src/db/connection');

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('SyncStore', () => {
  let syncStore: SyncStore;
  
  // Helper function to create mock query results
  const createMockQueryResult = (rows: any[] = [], rowCount: number = 0) => ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: []
  });

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

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create instance
    syncStore = new SyncStore();
  });

  describe('getLastSyncTimestamp', () => {
    it('should get last sync timestamp', async () => {
      // Arrange
      mockedQuery.mockResolvedValue(createMockQueryResult([{ timestamp }], 1));

      // Act
      const result = await syncStore.getLastSyncTimestamp(
        confluencePageIdOrUrl,
        linearTeamId
      );

      // Assert
      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT timestamp FROM sync_state WHERE confluence_page_id = $1 AND linear_team_id = $2',
        [confluencePageIdOrUrl, linearTeamId]
      );
      expect(result).toBe(timestamp);
    });

    it('should return null if no sync state found', async () => {
      // Arrange
      mockedQuery.mockResolvedValue(createMockQueryResult([], 0));

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
      mockedQuery.mockRejectedValue(error);

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
      // Arrange
      mockedQuery.mockResolvedValue(createMockQueryResult([], 1));

      // Act
      await syncStore.updateLastSyncTimestamp(
        confluencePageIdOrUrl,
        linearTeamId,
        timestamp
      );

      // Assert
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_state'),
        [confluencePageIdOrUrl, linearTeamId, timestamp]
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockedQuery.mockRejectedValue(error);

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
      // Arrange
      mockedQuery.mockResolvedValue(createMockQueryResult([], 1));

      // Act
      await syncStore.storeConflict(conflict);

      // Assert
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conflicts'),
        [
          conflict.id,
          JSON.stringify(conflict.linearChange),
          JSON.stringify(conflict.confluenceChange),
          conflict.isResolved,
          conflict.resolutionStrategy || null
        ]
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockedQuery.mockRejectedValue(error);

      // Act & Assert
      await expect(syncStore.storeConflict(conflict)).rejects.toThrow(error);
    });
  });

  describe('getUnresolvedConflicts', () => {
    it('should get unresolved conflicts', async () => {
      // Arrange
      const mockConflictRow = {
        id: conflict.id,
        linear_change: JSON.stringify(conflict.linearChange),
        confluence_change: JSON.stringify(conflict.confluenceChange),
        is_resolved: false,
        resolution_strategy: null
      };
      mockedQuery.mockResolvedValue(createMockQueryResult([mockConflictRow], 1));

      // Act
      const result = await syncStore.getUnresolvedConflicts();

      // Assert
      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT * FROM conflicts WHERE is_resolved = false'
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(conflict.id);
      expect(result[0].isResolved).toBe(false);
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockedQuery.mockRejectedValue(error);

      // Act
      const result = await syncStore.getUnresolvedConflicts();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getAllConflicts', () => {
    it('should get all conflicts', async () => {
      // Arrange
      const mockConflictRow = {
        id: conflict.id,
        linear_change: JSON.stringify(conflict.linearChange),
        confluence_change: JSON.stringify(conflict.confluenceChange),
        is_resolved: false,
        resolution_strategy: null,
        resolved_change: null
      };
      mockedQuery.mockResolvedValue(createMockQueryResult([mockConflictRow], 1));

      // Act
      const result = await syncStore.getAllConflicts();

      // Assert
      expect(mockedQuery).toHaveBeenCalledWith('SELECT * FROM conflicts');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(conflict.id);
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      mockedQuery.mockRejectedValue(error);

      // Act
      const result = await syncStore.getAllConflicts();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
