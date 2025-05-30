/**
 * Enhanced Health Check Endpoint
 * 
 * This module provides comprehensive health check endpoints for external monitoring
 * and system status reporting.
 */
import { Router, Request, Response } from 'express';
import { HealthMonitor } from '../monitoring/health-monitor';
import { BudgetMonitor } from '../monitoring/budget-monitor';
import { OperationalNotificationCoordinator } from '../utils/operational-notification-coordinator';
import {
  HealthCheckResponse,
  HealthStatus,
  SystemHealthStatus
} from '../types/monitoring-types';
import * as logger from '../utils/logger';
const packageJson = require('../../package.json');

const router = Router();

// Initialize monitoring components
let healthMonitor: HealthMonitor;
let budgetMonitor: BudgetMonitor;
let coordinator: OperationalNotificationCoordinator;

/**
 * Initialize health monitoring components
 */
const initializeHealthComponents = () => {
  if (!healthMonitor) {
    healthMonitor = new HealthMonitor({
      environment: (process.env.NODE_ENV as any) || 'development',
      notificationsEnabled: process.env.HEALTH_NOTIFICATIONS_ENABLED !== 'false'
    });
  }

  if (!budgetMonitor) {
    budgetMonitor = new BudgetMonitor();
  }

  if (!coordinator) {
    const config = OperationalNotificationCoordinator.createDefaultConfig(
      (process.env.NODE_ENV as any) || 'development'
    );
    coordinator = OperationalNotificationCoordinator.getInstance(config);
  }
};

/**
 * Set health monitoring components (for testing)
 */
export const setHealthComponents = (
  health?: HealthMonitor,
  budget?: BudgetMonitor,
  coord?: OperationalNotificationCoordinator
) => {
  if (health) healthMonitor = health;
  if (budget) budgetMonitor = budget;
  if (coord) coordinator = coord;
};

/**
 * Basic health check endpoint
 * GET /api/health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    initializeHealthComponents();

    const startTime = Date.now();
    const uptime = process.uptime();
    
    // Get basic health status
    const basicHealth = coordinator.getHealthStatus();
    const overallStatus: HealthStatus = basicHealth.overall === 'healthy' ? 'healthy' : 
                                       basicHealth.overall === 'warning' ? 'warning' : 'critical';

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      version: packageJson.version,
      environment: process.env.NODE_ENV || 'development',
      components: {
        api: {
          status: 'healthy',
          details: {
            responseTime: Date.now() - startTime
          }
        },
        database: {
          status: 'healthy' // Will be enhanced with actual DB check
        },
        notifications: {
          status: coordinator ? 'healthy' : 'unknown'
        }
      },
      alerts: []
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'warning' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Error in basic health check', { error });
    res.status(503).json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * Detailed health check endpoint
 * GET /api/health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    initializeHealthComponents();

    const startTime = Date.now();
    const uptime = process.uptime();

    // Get comprehensive health status
    const systemHealth = await healthMonitor.getHealthStatus();
    const budgetUsage = budgetMonitor.getBudgetUsage('daily');
    const apiStats = budgetMonitor.getAPIUsageStats();

    const response: HealthCheckResponse = {
      status: systemHealth.overall,
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      version: packageJson.version,
      environment: process.env.NODE_ENV || 'development',
      components: {
        tokens: {
          status: systemHealth.components.tokens.overall,
          details: {
            linear: {
              expiresAt: systemHealth.components.tokens.linearToken.expiresAt,
              daysUntilExpiration: systemHealth.components.tokens.linearToken.daysUntilExpiration,
              isHealthy: systemHealth.components.tokens.linearToken.isHealthy
            },
            confluence: {
              expiresAt: systemHealth.components.tokens.confluenceToken.expiresAt,
              daysUntilExpiration: systemHealth.components.tokens.confluenceToken.daysUntilExpiration,
              isHealthy: systemHealth.components.tokens.confluenceToken.isHealthy
            }
          }
        },
        apis: {
          status: systemHealth.components.apis.overall,
          details: {
            linear: {
              usagePercentage: systemHealth.components.apis.linear.usagePercentage,
              remainingCalls: systemHealth.components.apis.linear.remainingCalls,
              responseTime: systemHealth.components.apis.linear.responseTime,
              isHealthy: systemHealth.components.apis.linear.isHealthy
            },
            confluence: {
              usagePercentage: systemHealth.components.apis.confluence.usagePercentage,
              remainingCalls: systemHealth.components.apis.confluence.remainingCalls,
              responseTime: systemHealth.components.apis.confluence.responseTime,
              isHealthy: systemHealth.components.apis.confluence.isHealthy
            },
            statistics: apiStats
          }
        },
        resources: {
          status: systemHealth.components.resources.overall,
          details: {
            memory: {
              usagePercentage: systemHealth.components.resources.memory.usagePercentage,
              usedMB: systemHealth.components.resources.memory.usedMB,
              totalMB: systemHealth.components.resources.memory.totalMB,
              isHealthy: systemHealth.components.resources.memory.isHealthy
            },
            disk: {
              usagePercentage: systemHealth.components.resources.disk.usagePercentage,
              usedGB: systemHealth.components.resources.disk.usedGB,
              totalGB: systemHealth.components.resources.disk.totalGB,
              isHealthy: systemHealth.components.resources.disk.isHealthy
            },
            database: {
              connectionCount: systemHealth.components.resources.database.connectionCount,
              maxConnections: systemHealth.components.resources.database.maxConnections,
              responseTime: systemHealth.components.resources.database.responseTime,
              isHealthy: systemHealth.components.resources.database.isHealthy
            }
          }
        },
        operations: {
          status: systemHealth.components.operations.overall,
          details: {
            sync: {
              lastSuccessfulSync: systemHealth.components.operations.sync.lastSuccessfulSync,
              minutesSinceLastSync: systemHealth.components.operations.sync.minutesSinceLastSync,
              isHealthy: systemHealth.components.operations.sync.isHealthy
            },
            planning: {
              lastSuccessfulPlanning: systemHealth.components.operations.planning.lastSuccessfulPlanning,
              minutesSinceLastPlanning: systemHealth.components.operations.planning.minutesSinceLastPlanning,
              isHealthy: systemHealth.components.operations.planning.isHealthy
            },
            webhooks: {
              queueSize: systemHealth.components.operations.webhooks.queueSize,
              processingRate: systemHealth.components.operations.webhooks.processingRate,
              isHealthy: systemHealth.components.operations.webhooks.isHealthy
            }
          }
        }
      },
      alerts: systemHealth.alerts,
      budget: budgetUsage
    };

    // Set appropriate HTTP status code
    const statusCode = systemHealth.overall === 'healthy' ? 200 : 
                      systemHealth.overall === 'warning' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Error in detailed health check', { error });
    res.status(503).json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

/**
 * Health metrics endpoint
 * GET /api/health/metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    initializeHealthComponents();

    const metrics = healthMonitor.getHealthMetrics();
    const apiStats = budgetMonitor.getAPIUsageStats();
    const dailyBudget = budgetMonitor.getBudgetUsage('daily');
    const monthlyBudget = budgetMonitor.getBudgetUsage('monthly');

    res.json({
      timestamp: new Date().toISOString(),
      metrics: {
        health: metrics,
        api: apiStats,
        budget: {
          daily: dailyBudget,
          monthly: monthlyBudget
        }
      }
    });
  } catch (error) {
    logger.error('Error getting health metrics', { error });
    res.status(500).json({
      error: 'Failed to retrieve health metrics'
    });
  }
});

/**
 * System status dashboard endpoint
 * GET /api/health/dashboard
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    initializeHealthComponents();

    const systemHealth = await healthMonitor.getHealthStatus();
    const budgetUsage = budgetMonitor.getBudgetUsage('daily');
    const coordinatorStats = coordinator.getCoordinatorStats();

    // Create dashboard-friendly response
    const dashboard = {
      timestamp: new Date().toISOString(),
      overall: {
        status: systemHealth.overall,
        isHealthy: systemHealth.isHealthy,
        uptime: Math.round(process.uptime()),
        environment: process.env.NODE_ENV || 'development'
      },
      components: {
        tokens: {
          status: systemHealth.components.tokens.overall,
          linear: {
            status: systemHealth.components.tokens.linearToken.isHealthy ? 'healthy' : 'warning',
            daysUntilExpiration: systemHealth.components.tokens.linearToken.daysUntilExpiration
          },
          confluence: {
            status: systemHealth.components.tokens.confluenceToken.isHealthy ? 'healthy' : 'warning',
            daysUntilExpiration: systemHealth.components.tokens.confluenceToken.daysUntilExpiration
          }
        },
        apis: {
          status: systemHealth.components.apis.overall,
          linear: {
            usagePercentage: systemHealth.components.apis.linear.usagePercentage,
            status: systemHealth.components.apis.linear.isHealthy ? 'healthy' : 'warning'
          },
          confluence: {
            usagePercentage: systemHealth.components.apis.confluence.usagePercentage,
            status: systemHealth.components.apis.confluence.isHealthy ? 'healthy' : 'warning'
          }
        },
        resources: {
          status: systemHealth.components.resources.overall,
          memory: {
            usagePercentage: systemHealth.components.resources.memory.usagePercentage,
            status: systemHealth.components.resources.memory.isHealthy ? 'healthy' : 'warning'
          },
          disk: {
            usagePercentage: systemHealth.components.resources.disk.usagePercentage,
            status: systemHealth.components.resources.disk.isHealthy ? 'healthy' : 'warning'
          },
          database: {
            connectionCount: systemHealth.components.resources.database.connectionCount,
            maxConnections: systemHealth.components.resources.database.maxConnections,
            status: systemHealth.components.resources.database.isHealthy ? 'healthy' : 'warning'
          }
        },
        operations: {
          status: systemHealth.components.operations.overall,
          sync: {
            minutesSinceLastSync: systemHealth.components.operations.sync.minutesSinceLastSync,
            status: systemHealth.components.operations.sync.isHealthy ? 'healthy' : 'warning'
          },
          planning: {
            minutesSinceLastPlanning: systemHealth.components.operations.planning.minutesSinceLastPlanning,
            status: systemHealth.components.operations.planning.isHealthy ? 'healthy' : 'warning'
          }
        }
      },
      budget: {
        isOverBudget: budgetUsage.isOverBudget,
        totalCost: budgetUsage.totalEstimatedCost,
        apiUsage: {
          linear: budgetUsage.apiUsage.linear.usagePercentage,
          confluence: budgetUsage.apiUsage.confluence.usagePercentage
        }
      },
      notifications: {
        enabled: coordinatorStats.healthMonitoringEnabled,
        environment: coordinatorStats.environment
      },
      alerts: systemHealth.alerts.length
    };

    res.json(dashboard);
  } catch (error) {
    logger.error('Error getting health dashboard', { error });
    res.status(500).json({
      error: 'Failed to retrieve health dashboard'
    });
  }
});

/**
 * Health configuration endpoint
 * GET /api/health/config
 */
router.get('/config', (req: Request, res: Response) => {
  try {
    initializeHealthComponents();

    const healthConfig = healthMonitor.getConfig();
    const budgetConfig = budgetMonitor.getConfig();
    const coordinatorStats = coordinator.getCoordinatorStats();

    res.json({
      health: healthConfig,
      budget: budgetConfig,
      coordinator: {
        environment: coordinatorStats.environment,
        healthMonitoringEnabled: coordinatorStats.healthMonitoringEnabled,
        isInitialized: coordinatorStats.isInitialized
      }
    });
  } catch (error) {
    logger.error('Error getting health configuration', { error });
    res.status(500).json({
      error: 'Failed to retrieve health configuration'
    });
  }
});

/**
 * Start health monitoring endpoint
 * POST /api/health/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    initializeHealthComponents();

    await healthMonitor.startMonitoring();
    
    res.json({
      message: 'Health monitoring started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error starting health monitoring', { error });
    res.status(500).json({
      error: 'Failed to start health monitoring'
    });
  }
});

/**
 * Stop health monitoring endpoint
 * POST /api/health/stop
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    if (healthMonitor) {
      await healthMonitor.stopMonitoring();
    }
    
    res.json({
      message: 'Health monitoring stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error stopping health monitoring', { error });
    res.status(500).json({
      error: 'Failed to stop health monitoring'
    });
  }
});

export default router;
