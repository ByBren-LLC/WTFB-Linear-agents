import { query, getClient } from './connection';
import * as logger from '../utils/logger';
import { runMigrations } from './migrations';

// TypeScript interfaces for database tables

/**
 * Linear OAuth token
 */
export interface LinearToken {
  id: number;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  app_user_id: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Planning session
 */
export interface PlanningSession {
  id: number;
  organization_id: string;
  confluence_page_url: string;
  planning_title: string;
  epic_id?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Planning feature
 */
export interface PlanningFeature {
  id: number;
  planning_session_id: number;
  feature_id: string;
  title: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Planning story
 */
export interface PlanningStory {
  id: number;
  planning_feature_id: number;
  story_id: string;
  title: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Planning enabler
 */
export interface PlanningEnabler {
  id: number;
  planning_session_id: number;
  enabler_id: string;
  title: string;
  description?: string;
  enabler_type: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Initializes the database schema by running migrations
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    await runMigrations();
    logger.info('Database schema initialized');
  } catch (error) {
    logger.error('Error initializing database schema', { error });
    throw error;
  }
};

// Linear Token CRUD Operations

/**
 * Stores OAuth tokens for an organization
 */
export const storeLinearToken = async (
  organizationId: string,
  accessToken: string,
  refreshToken: string,
  appUserId: string,
  expiresAt: Date
): Promise<void> => {
  try {
    await query(
      `
        INSERT INTO linear_tokens (organization_id, access_token, refresh_token, app_user_id, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (organization_id) DO UPDATE SET
          access_token = $2,
          refresh_token = $3,
          app_user_id = $4,
          expires_at = $5,
          updated_at = NOW()
      `,
      [organizationId, accessToken, refreshToken, appUserId, expiresAt]
    );

    logger.info('Tokens stored for organization', { organizationId });
  } catch (error) {
    logger.error('Error storing tokens', { error, organizationId });
    throw error;
  }
};

/**
 * Retrieves the Linear token for an organization
 */
export const getLinearToken = async (organizationId: string): Promise<LinearToken | null> => {
  try {
    const result = await query(
      'SELECT * FROM linear_tokens WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      logger.warn('No tokens found for organization', { organizationId });
      return null;
    }

    return result.rows[0] as LinearToken;
  } catch (error) {
    logger.error('Error retrieving token', { error, organizationId });
    throw error;
  }
};

/**
 * Retrieves the access token for an organization
 */
export const getAccessToken = async (organizationId: string): Promise<string | null> => {
  try {
    const token = await getLinearToken(organizationId);

    if (!token) {
      return null;
    }

    // Check if token is expired
    if (new Date() > new Date(token.expires_at)) {
      logger.warn('Token expired for organization', { organizationId });
      // TODO: Implement token refresh
      return null;
    }

    return token.access_token;
  } catch (error) {
    logger.error('Error retrieving access token', { error, organizationId });
    throw error;
  }
};

/**
 * Deletes a Linear token for an organization
 */
export const deleteLinearToken = async (organizationId: string): Promise<boolean> => {
  try {
    const result = await query(
      'DELETE FROM linear_tokens WHERE organization_id = $1',
      [organizationId]
    );

    const deleted = result.rowCount > 0;
    if (deleted) {
      logger.info('Token deleted for organization', { organizationId });
    } else {
      logger.warn('No token found to delete for organization', { organizationId });
    }

    return deleted;
  } catch (error) {
    logger.error('Error deleting token', { error, organizationId });
    throw error;
  }
};

// Planning Session CRUD Operations

/**
 * Creates a new planning session
 */
export const createPlanningSession = async (
  organizationId: string,
  confluencePageUrl: string,
  planningTitle: string,
  epicId?: string,
  status: string = 'pending'
): Promise<PlanningSession> => {
  try {
    const result = await query(
      `
        INSERT INTO planning_sessions (
          organization_id, confluence_page_url, planning_title, epic_id, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [organizationId, confluencePageUrl, planningTitle, epicId, status]
    );

    logger.info('Planning session created', {
      organizationId,
      planningTitle,
      sessionId: result.rows[0].id
    });

    return result.rows[0] as PlanningSession;
  } catch (error) {
    logger.error('Error creating planning session', {
      error,
      organizationId,
      planningTitle
    });
    throw error;
  }
};

/**
 * Gets a planning session by ID
 */
export const getPlanningSession = async (sessionId: number): Promise<PlanningSession | null> => {
  try {
    const result = await query(
      'SELECT * FROM planning_sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      logger.warn('No planning session found with ID', { sessionId });
      return null;
    }

    return result.rows[0] as PlanningSession;
  } catch (error) {
    logger.error('Error retrieving planning session', { error, sessionId });
    throw error;
  }
};

/**
 * Gets all planning sessions for an organization
 */
export const getPlanningSessionsByOrganization = async (
  organizationId: string
): Promise<PlanningSession[]> => {
  try {
    const result = await query(
      'SELECT * FROM planning_sessions WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );

    return result.rows as PlanningSession[];
  } catch (error) {
    logger.error('Error retrieving planning sessions', { error, organizationId });
    throw error;
  }
};

/**
 * Updates a planning session
 */
export const updatePlanningSession = async (
  sessionId: number,
  updates: Partial<PlanningSession>
): Promise<PlanningSession | null> => {
  try {
    // Build the SET clause dynamically based on the provided updates
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Add each field to the update query if it exists in the updates object
    if (updates.confluence_page_url !== undefined) {
      updateFields.push(`confluence_page_url = $${paramIndex}`);
      values.push(updates.confluence_page_url);
      paramIndex++;
    }

    if (updates.planning_title !== undefined) {
      updateFields.push(`planning_title = $${paramIndex}`);
      values.push(updates.planning_title);
      paramIndex++;
    }

    if (updates.epic_id !== undefined) {
      updateFields.push(`epic_id = $${paramIndex}`);
      values.push(updates.epic_id);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = NOW()');

    // If no fields to update, return the current session
    if (updateFields.length === 1) { // Only updated_at
      return getPlanningSession(sessionId);
    }

    // Add the session ID to the values array
    values.push(sessionId);

    const result = await query(
      `
        UPDATE planning_sessions
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      logger.warn('No planning session found to update', { sessionId });
      return null;
    }

    logger.info('Planning session updated', { sessionId });
    return result.rows[0] as PlanningSession;
  } catch (error) {
    logger.error('Error updating planning session', { error, sessionId });
    throw error;
  }
};

/**
 * Deletes a planning session
 */
export const deletePlanningSession = async (sessionId: number): Promise<boolean> => {
  try {
    // Start a transaction to delete the session and all related records
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Delete related planning_features (which will cascade to planning_stories)
      await client.query(
        'DELETE FROM planning_features WHERE planning_session_id = $1',
        [sessionId]
      );

      // Delete related planning_enablers
      await client.query(
        'DELETE FROM planning_enablers WHERE planning_session_id = $1',
        [sessionId]
      );

      // Delete the planning session
      const result = await client.query(
        'DELETE FROM planning_sessions WHERE id = $1',
        [sessionId]
      );

      await client.query('COMMIT');

      const deleted = result.rowCount > 0;
      if (deleted) {
        logger.info('Planning session deleted', { sessionId });
      } else {
        logger.warn('No planning session found to delete', { sessionId });
      }

      return deleted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error deleting planning session', { error, sessionId });
    throw error;
  }
};

// Planning Feature CRUD Operations

/**
 * Creates a new planning feature
 */
export const createPlanningFeature = async (
  planningSessionId: number,
  featureId: string,
  title: string,
  description?: string
): Promise<PlanningFeature> => {
  try {
    const result = await query(
      `
        INSERT INTO planning_features (
          planning_session_id, feature_id, title, description
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [planningSessionId, featureId, title, description]
    );

    logger.info('Planning feature created', {
      planningSessionId,
      featureId,
      title,
      featureDbId: result.rows[0].id
    });

    return result.rows[0] as PlanningFeature;
  } catch (error) {
    logger.error('Error creating planning feature', {
      error,
      planningSessionId,
      featureId,
      title
    });
    throw error;
  }
};

/**
 * Gets a planning feature by ID
 */
export const getPlanningFeature = async (featureId: number): Promise<PlanningFeature | null> => {
  try {
    const result = await query(
      'SELECT * FROM planning_features WHERE id = $1',
      [featureId]
    );

    if (result.rows.length === 0) {
      logger.warn('No planning feature found with ID', { featureId });
      return null;
    }

    return result.rows[0] as PlanningFeature;
  } catch (error) {
    logger.error('Error retrieving planning feature', { error, featureId });
    throw error;
  }
};

/**
 * Gets all planning features for a planning session
 */
export const getPlanningFeaturesBySession = async (
  planningSessionId: number
): Promise<PlanningFeature[]> => {
  try {
    const result = await query(
      'SELECT * FROM planning_features WHERE planning_session_id = $1 ORDER BY created_at',
      [planningSessionId]
    );

    return result.rows as PlanningFeature[];
  } catch (error) {
    logger.error('Error retrieving planning features', { error, planningSessionId });
    throw error;
  }
};

/**
 * Updates a planning feature
 */
export const updatePlanningFeature = async (
  featureId: number,
  updates: Partial<PlanningFeature>
): Promise<PlanningFeature | null> => {
  try {
    // Build the SET clause dynamically based on the provided updates
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.feature_id !== undefined) {
      updateFields.push(`feature_id = $${paramIndex}`);
      values.push(updates.feature_id);
      paramIndex++;
    }

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = NOW()');

    // If no fields to update, return the current feature
    if (updateFields.length === 1) { // Only updated_at
      return getPlanningFeature(featureId);
    }

    // Add the feature ID to the values array
    values.push(featureId);

    const result = await query(
      `
        UPDATE planning_features
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      logger.warn('No planning feature found to update', { featureId });
      return null;
    }

    logger.info('Planning feature updated', { featureId });
    return result.rows[0] as PlanningFeature;
  } catch (error) {
    logger.error('Error updating planning feature', { error, featureId });
    throw error;
  }
};

/**
 * Deletes a planning feature
 */
export const deletePlanningFeature = async (featureId: number): Promise<boolean> => {
  try {
    // Start a transaction to delete the feature and all related stories
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Delete related planning_stories
      await client.query(
        'DELETE FROM planning_stories WHERE planning_feature_id = $1',
        [featureId]
      );

      // Delete the planning feature
      const result = await client.query(
        'DELETE FROM planning_features WHERE id = $1',
        [featureId]
      );

      await client.query('COMMIT');

      const deleted = result.rowCount > 0;
      if (deleted) {
        logger.info('Planning feature deleted', { featureId });
      } else {
        logger.warn('No planning feature found to delete', { featureId });
      }

      return deleted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error deleting planning feature', { error, featureId });
    throw error;
  }
};

// Planning Story CRUD Operations

/**
 * Creates a new planning story
 */
export const createPlanningStory = async (
  planningFeatureId: number,
  storyId: string,
  title: string,
  description?: string
): Promise<PlanningStory> => {
  try {
    const result = await query(
      `
        INSERT INTO planning_stories (
          planning_feature_id, story_id, title, description
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [planningFeatureId, storyId, title, description]
    );

    logger.info('Planning story created', {
      planningFeatureId,
      storyId,
      title,
      storyDbId: result.rows[0].id
    });

    return result.rows[0] as PlanningStory;
  } catch (error) {
    logger.error('Error creating planning story', {
      error,
      planningFeatureId,
      storyId,
      title
    });
    throw error;
  }
};

/**
 * Gets a planning story by ID
 */
export const getPlanningStory = async (storyId: number): Promise<PlanningStory | null> => {
  try {
    const result = await query(
      'SELECT * FROM planning_stories WHERE id = $1',
      [storyId]
    );

    if (result.rows.length === 0) {
      logger.warn('No planning story found with ID', { storyId });
      return null;
    }

    return result.rows[0] as PlanningStory;
  } catch (error) {
    logger.error('Error retrieving planning story', { error, storyId });
    throw error;
  }
};

/**
 * Gets all planning stories for a planning feature
 */
export const getPlanningStoriesByFeature = async (
  planningFeatureId: number
): Promise<PlanningStory[]> => {
  try {
    const result = await query(
      'SELECT * FROM planning_stories WHERE planning_feature_id = $1 ORDER BY created_at',
      [planningFeatureId]
    );

    return result.rows as PlanningStory[];
  } catch (error) {
    logger.error('Error retrieving planning stories', { error, planningFeatureId });
    throw error;
  }
};

/**
 * Updates a planning story
 */
export const updatePlanningStory = async (
  storyId: number,
  updates: Partial<PlanningStory>
): Promise<PlanningStory | null> => {
  try {
    // Build the SET clause dynamically based on the provided updates
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.story_id !== undefined) {
      updateFields.push(`story_id = $${paramIndex}`);
      values.push(updates.story_id);
      paramIndex++;
    }

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = NOW()');

    // If no fields to update, return the current story
    if (updateFields.length === 1) { // Only updated_at
      return getPlanningStory(storyId);
    }

    // Add the story ID to the values array
    values.push(storyId);

    const result = await query(
      `
        UPDATE planning_stories
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      logger.warn('No planning story found to update', { storyId });
      return null;
    }

    logger.info('Planning story updated', { storyId });
    return result.rows[0] as PlanningStory;
  } catch (error) {
    logger.error('Error updating planning story', { error, storyId });
    throw error;
  }
};

/**
 * Deletes a planning story
 */
export const deletePlanningStory = async (storyId: number): Promise<boolean> => {
  try {
    const result = await query(
      'DELETE FROM planning_stories WHERE id = $1',
      [storyId]
    );

    const deleted = result.rowCount > 0;
    if (deleted) {
      logger.info('Planning story deleted', { storyId });
    } else {
      logger.warn('No planning story found to delete', { storyId });
    }

    return deleted;
  } catch (error) {
    logger.error('Error deleting planning story', { error, storyId });
    throw error;
  }
};

// Planning Enabler CRUD Operations

/**
 * Creates a new planning enabler
 */
export const createPlanningEnabler = async (
  planningSessionId: number,
  enablerId: string,
  title: string,
  enablerType: string,
  description?: string
): Promise<PlanningEnabler> => {
  try {
    const result = await query(
      `
        INSERT INTO planning_enablers (
          planning_session_id, enabler_id, title, enabler_type, description
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [planningSessionId, enablerId, title, enablerType, description]
    );

    logger.info('Planning enabler created', {
      planningSessionId,
      enablerId,
      title,
      enablerType,
      enablerDbId: result.rows[0].id
    });

    return result.rows[0] as PlanningEnabler;
  } catch (error) {
    logger.error('Error creating planning enabler', {
      error,
      planningSessionId,
      enablerId,
      title,
      enablerType
    });
    throw error;
  }
};

/**
 * Gets a planning enabler by ID
 */
export const getPlanningEnabler = async (enablerId: number): Promise<PlanningEnabler | null> => {
  try {
    const result = await query(
      'SELECT * FROM planning_enablers WHERE id = $1',
      [enablerId]
    );

    if (result.rows.length === 0) {
      logger.warn('No planning enabler found with ID', { enablerId });
      return null;
    }

    return result.rows[0] as PlanningEnabler;
  } catch (error) {
    logger.error('Error retrieving planning enabler', { error, enablerId });
    throw error;
  }
};

/**
 * Gets all planning enablers for a planning session
 */
export const getPlanningEnablersBySession = async (
  planningSessionId: number
): Promise<PlanningEnabler[]> => {
  try {
    const result = await query(
      'SELECT * FROM planning_enablers WHERE planning_session_id = $1 ORDER BY created_at',
      [planningSessionId]
    );

    return result.rows as PlanningEnabler[];
  } catch (error) {
    logger.error('Error retrieving planning enablers', { error, planningSessionId });
    throw error;
  }
};

/**
 * Updates a planning enabler
 */
export const updatePlanningEnabler = async (
  enablerId: number,
  updates: Partial<PlanningEnabler>
): Promise<PlanningEnabler | null> => {
  try {
    // Build the SET clause dynamically based on the provided updates
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.enabler_id !== undefined) {
      updateFields.push(`enabler_id = $${paramIndex}`);
      values.push(updates.enabler_id);
      paramIndex++;
    }

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }

    if (updates.enabler_type !== undefined) {
      updateFields.push(`enabler_type = $${paramIndex}`);
      values.push(updates.enabler_type);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = NOW()');

    // If no fields to update, return the current enabler
    if (updateFields.length === 1) { // Only updated_at
      return getPlanningEnabler(enablerId);
    }

    // Add the enabler ID to the values array
    values.push(enablerId);

    const result = await query(
      `
        UPDATE planning_enablers
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      logger.warn('No planning enabler found to update', { enablerId });
      return null;
    }

    logger.info('Planning enabler updated', { enablerId });
    return result.rows[0] as PlanningEnabler;
  } catch (error) {
    logger.error('Error updating planning enabler', { error, enablerId });
    throw error;
  }
};

/**
 * Deletes a planning enabler
 */
export const deletePlanningEnabler = async (enablerId: number): Promise<boolean> => {
  try {
    const result = await query(
      'DELETE FROM planning_enablers WHERE id = $1',
      [enablerId]
    );

    const deleted = result.rowCount > 0;
    if (deleted) {
      logger.info('Planning enabler deleted', { enablerId });
    } else {
      logger.warn('No planning enabler found to delete', { enablerId });
    }

    return deleted;
  } catch (error) {
    logger.error('Error deleting planning enabler', { error, enablerId });
    throw error;
  }
};
