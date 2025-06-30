/**
 * Linear Work Assignment Manager for ART Planning (LIN-49 Phase 3)
 * 
 * Manages intelligent work assignment to teams and individuals
 * based on skills, capacity, and ART planning constraints.
 */

import {
  IterationPlan,
  ARTPlan,
  AllocatedWorkItem,
  ARTTeam,
  PlanningWorkItem
} from '../types/art-planning-types';
import { LinearClientWrapper } from '../linear/client';
import * as logger from '../utils/logger';

/**
 * Work assignment result
 */
export interface WorkAssignmentResult {
  workItemId: string;
  linearIssueId: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedTeamId: string;
  assignedTeamName: string;
  assignmentReason: string;
  confidence: number;
  assignmentStatus: 'success' | 'failed' | 'partial';
  warnings: string[];
}

/**
 * Team member with skills and capacity
 */
export interface TeamMember {
  userId: string;
  userName: string;
  email: string;
  teamId: string;
  skills: string[];
  currentCapacity: number;
  maxCapacity: number;
  timeZone: string;
  isActive: boolean;
}

/**
 * Assignment strategy configuration
 */
interface AssignmentConfig {
  enableSkillMatching: boolean;
  enableCapacityBalancing: boolean;
  enableWorkloadDistribution: boolean;
  skillMatchWeight: number;
  capacityWeight: number;
  experienceWeight: number;
  minimumConfidence: number;
}

/**
 * Default assignment configuration
 */
const DEFAULT_ASSIGNMENT_CONFIG: AssignmentConfig = {
  enableSkillMatching: true,
  enableCapacityBalancing: true,
  enableWorkloadDistribution: true,
  skillMatchWeight: 0.4,
  capacityWeight: 0.3,
  experienceWeight: 0.3,
  minimumConfidence: 0.6
};

/**
 * Manages intelligent work assignment in Linear based on ART planning
 */
export class LinearWorkAssignmentManager {
  private config: AssignmentConfig;
  private linearClient: LinearClientWrapper;
  private teamMembers: Map<string, TeamMember[]> = new Map();

  constructor(
    linearClient: LinearClientWrapper,
    config: Partial<AssignmentConfig> = {}
  ) {
    this.linearClient = linearClient;
    this.config = { ...DEFAULT_ASSIGNMENT_CONFIG, ...config };
    
    logger.debug('LinearWorkAssignmentManager initialized', {
      skillMatching: this.config.enableSkillMatching,
      capacityBalancing: this.config.enableCapacityBalancing,
      minimumConfidence: this.config.minimumConfidence
    });
  }

  /**
   * Assign work items for entire ART plan
   */
  async assignWorkForARTPlan(
    artPlan: ARTPlan,
    teams: ARTTeam[]
  ): Promise<WorkAssignmentResult[]> {
    logger.info('Starting work assignment for ART plan', {
      piName: artPlan.programIncrement.name,
      iterationCount: artPlan.iterations.length,
      teamCount: teams.length,
      totalWorkItems: artPlan.workItems.length
    });

    // Load team members from Linear
    await this.loadTeamMembers(teams);

    const allResults: WorkAssignmentResult[] = [];

    // Process each iteration
    for (const iteration of artPlan.iterations) {
      const iterationResults = await this.assignWorkForIteration(
        iteration,
        teams
      );
      allResults.push(...iterationResults);
    }

    // Log summary
    const successCount = allResults.filter(r => r.assignmentStatus === 'success').length;
    const failedCount = allResults.filter(r => r.assignmentStatus === 'failed').length;

    logger.info('ART plan work assignment completed', {
      totalAssignments: allResults.length,
      successful: successCount,
      failed: failedCount,
      successRate: allResults.length > 0 ? (successCount / allResults.length * 100).toFixed(1) + '%' : '0%'
    });

    return allResults;
  }

  /**
   * Assign work items for a single iteration
   */
  async assignWorkForIteration(
    iteration: IterationPlan,
    teams: ARTTeam[]
  ): Promise<WorkAssignmentResult[]> {
    logger.debug('Assigning work for iteration', {
      iterationId: iteration.iteration.id,
      workItemCount: iteration.allocatedWork.length
    });

    const results: WorkAssignmentResult[] = [];

    for (const allocatedItem of iteration.allocatedWork) {
      try {
        const assignmentResult = await this.assignSingleWorkItem(
          allocatedItem,
          teams
        );
        results.push(assignmentResult);
      } catch (error) {
        logger.error('Failed to assign work item', {
          workItemId: allocatedItem.workItem.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        results.push({
          workItemId: allocatedItem.workItem.id,
          linearIssueId: '',
          assignedTeamId: allocatedItem.assignedTeam,
          assignedTeamName: this.getTeamName(allocatedItem.assignedTeam, teams),
          assignmentReason: 'Assignment failed due to error',
          confidence: 0,
          assignmentStatus: 'failed',
          warnings: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    logger.info('Iteration work assignment completed', {
      iterationId: iteration.iteration.id,
      assignments: results.length,
      successful: results.filter(r => r.assignmentStatus === 'success').length
    });

    return results;
  }

  /**
   * Assign a single work item to best available team member
   */
  async assignSingleWorkItem(
    allocatedItem: AllocatedWorkItem,
    teams: ARTTeam[]
  ): Promise<WorkAssignmentResult> {
    const workItem = allocatedItem.workItem;

    // Find Linear issue for this work item
    const linearIssue = await this.findLinearIssueForWorkItem(workItem);
    if (!linearIssue) {
      throw new Error(`No Linear issue found for work item ${workItem.id}`);
    }

    // Find best assignee
    const assignmentDecision = await this.findBestAssignee(
      allocatedItem,
      teams
    );

    if (!assignmentDecision.assignedUserId) {
      // Assign to team only
      return {
        workItemId: workItem.id,
        linearIssueId: linearIssue.id,
        assignedTeamId: assignmentDecision.assignedTeamId,
        assignedTeamName: assignmentDecision.assignedTeamName,
        assignmentReason: assignmentDecision.assignmentReason,
        confidence: assignmentDecision.confidence,
        assignmentStatus: assignmentDecision.confidence >= this.config.minimumConfidence ? 'success' : 'partial',
        warnings: assignmentDecision.warnings
      };
    }

    // Assign to specific user
    try {
      await this.linearClient.updateIssue({
        id: linearIssue.id,
        assigneeId: assignmentDecision.assignedUserId
      });

      logger.debug('Work item assigned to user', {
        workItemId: workItem.id,
        issueId: linearIssue.id,
        assigneeId: assignmentDecision.assignedUserId,
        confidence: assignmentDecision.confidence
      });

      return {
        workItemId: workItem.id,
        linearIssueId: linearIssue.id,
        assignedUserId: assignmentDecision.assignedUserId,
        assignedUserName: assignmentDecision.assignedUserName,
        assignedTeamId: assignmentDecision.assignedTeamId,
        assignedTeamName: assignmentDecision.assignedTeamName,
        assignmentReason: assignmentDecision.assignmentReason,
        confidence: assignmentDecision.confidence,
        assignmentStatus: 'success',
        warnings: assignmentDecision.warnings
      };
    } catch (error) {
      logger.error('Failed to assign issue to user', {
        workItemId: workItem.id,
        issueId: linearIssue.id,
        assigneeId: assignmentDecision.assignedUserId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        workItemId: workItem.id,
        linearIssueId: linearIssue.id,
        assignedTeamId: assignmentDecision.assignedTeamId,
        assignedTeamName: assignmentDecision.assignedTeamName,
        assignmentReason: 'Linear assignment failed',
        confidence: 0,
        assignmentStatus: 'failed',
        warnings: [`Failed to assign to user: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Find Linear issue for work item
   */
  private async findLinearIssueForWorkItem(workItem: PlanningWorkItem): Promise<any | null> {
    try {
      // Search by external ID first
      let issues = await this.linearClient.searchIssues({
        query: `externalId:${workItem.id}`
      });

      if (issues.nodes && issues.nodes.length > 0) {
        return issues.nodes[0];
      }

      // Search by title
      issues = await this.linearClient.searchIssues({
        query: workItem.title
      });

      // Find exact match
      const exactMatch = issues.nodes?.find(issue => 
        issue.title === workItem.title || issue.identifier === workItem.id
      );

      return exactMatch || null;
    } catch (error) {
      logger.warn('Failed to find Linear issue for work item', {
        workItemId: workItem.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Find best assignee for work item
   */
  private async findBestAssignee(
    allocatedItem: AllocatedWorkItem,
    teams: ARTTeam[]
  ): Promise<{
    assignedUserId?: string;
    assignedUserName?: string;
    assignedTeamId: string;
    assignedTeamName: string;
    assignmentReason: string;
    confidence: number;
    warnings: string[];
  }> {
    const workItem = allocatedItem.workItem;
    const assignedTeamId = allocatedItem.assignedTeam;
    const warnings: string[] = [];

    // Get team info
    const team = teams.find(t => t.id === assignedTeamId);
    if (!team) {
      throw new Error(`Team not found: ${assignedTeamId}`);
    }

    // Get team members
    const teamMembers = this.teamMembers.get(assignedTeamId) || [];
    if (teamMembers.length === 0) {
      warnings.push('No team members found for assignment');
      return {
        assignedTeamId,
        assignedTeamName: team.name,
        assignmentReason: 'No team members available',
        confidence: 0.3,
        warnings
      };
    }

    // Score each team member
    const memberScores = teamMembers
      .filter(member => member.isActive)
      .map(member => ({
        member,
        score: this.calculateAssignmentScore(member, workItem, allocatedItem),
        reasoning: this.generateAssignmentReasoning(member, workItem, allocatedItem)
      }))
      .sort((a, b) => b.score - a.score);

    if (memberScores.length === 0) {
      warnings.push('No active team members available');
      return {
        assignedTeamId,
        assignedTeamName: team.name,
        assignmentReason: 'No active team members',
        confidence: 0.3,
        warnings
      };
    }

    const bestMatch = memberScores[0];

    // Check if assignment meets minimum confidence
    if (bestMatch.score < this.config.minimumConfidence) {
      warnings.push(`Best match confidence (${(bestMatch.score * 100).toFixed(0)}%) below minimum (${(this.config.minimumConfidence * 100).toFixed(0)}%)`);
    }

    return {
      assignedUserId: bestMatch.member.userId,
      assignedUserName: bestMatch.member.userName,
      assignedTeamId,
      assignedTeamName: team.name,
      assignmentReason: bestMatch.reasoning,
      confidence: bestMatch.score,
      warnings
    };
  }

  /**
   * Calculate assignment score for team member
   */
  private calculateAssignmentScore(
    member: TeamMember,
    workItem: PlanningWorkItem,
    allocatedItem: AllocatedWorkItem
  ): number {
    let score = 0;

    // Skill matching score
    if (this.config.enableSkillMatching) {
      const skillScore = this.calculateSkillScore(member, workItem);
      score += skillScore * this.config.skillMatchWeight;
    }

    // Capacity score
    if (this.config.enableCapacityBalancing) {
      const capacityScore = this.calculateCapacityScore(member, allocatedItem);
      score += capacityScore * this.config.capacityWeight;
    }

    // Experience score (based on past work)
    const experienceScore = this.calculateExperienceScore(member, workItem);
    score += experienceScore * this.config.experienceWeight;

    return Math.min(1.0, score);
  }

  /**
   * Calculate skill matching score
   */
  private calculateSkillScore(member: TeamMember, workItem: PlanningWorkItem): number {
    const requiredSkills = this.extractRequiredSkills(workItem);
    if (requiredSkills.length === 0) return 0.5; // Neutral score if no skills specified

    const memberSkills = member.skills.map(s => s.toLowerCase());
    const matchedSkills = requiredSkills.filter(skill => 
      memberSkills.some(memberSkill => 
        memberSkill.includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(memberSkill)
      )
    );

    return matchedSkills.length / requiredSkills.length;
  }

  /**
   * Calculate capacity score
   */
  private calculateCapacityScore(member: TeamMember, allocatedItem: AllocatedWorkItem): number {
    if (member.maxCapacity === 0) return 0;

    const availableCapacity = member.maxCapacity - member.currentCapacity;
    const requiredCapacity = allocatedItem.allocatedPoints;

    if (availableCapacity >= requiredCapacity) {
      // Has enough capacity - score based on how well it fits
      const utilizationRatio = requiredCapacity / member.maxCapacity;
      return 1.0 - Math.abs(0.7 - utilizationRatio); // Optimal around 70% utilization
    } else {
      // Not enough capacity
      return availableCapacity / requiredCapacity * 0.5; // Partial score
    }
  }

  /**
   * Calculate experience score
   */
  private calculateExperienceScore(member: TeamMember, workItem: PlanningWorkItem): number {
    // Simple heuristic based on skills and work item type
    let score = 0.5; // Base score

    const workItemContent = `${workItem.title} ${workItem.description}`.toLowerCase();
    
    // Boost score for relevant skills
    for (const skill of member.skills) {
      if (workItemContent.includes(skill.toLowerCase())) {
        score += 0.1;
      }
    }

    // Type-specific experience
    if (workItem.type === 'story' && member.skills.includes('frontend')) {
      score += 0.1;
    }
    if (workItem.type === 'enabler' && member.skills.includes('devops')) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Extract required skills from work item
   */
  private extractRequiredSkills(workItem: PlanningWorkItem): string[] {
    const skills: string[] = [];
    const content = `${workItem.title} ${workItem.description}`.toLowerCase();

    // Common skill keywords
    const skillKeywords = [
      'react', 'vue', 'angular', 'javascript', 'typescript', 'node',
      'python', 'java', 'spring', 'django', 'flask',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'postgresql', 'mysql', 'mongodb', 'redis',
      'api', 'rest', 'graphql', 'microservices',
      'testing', 'cypress', 'jest', 'junit',
      'devops', 'ci/cd', 'jenkins', 'github actions',
      'design', 'ui', 'ux', 'figma', 'sketch'
    ];

    for (const keyword of skillKeywords) {
      if (content.includes(keyword)) {
        skills.push(keyword);
      }
    }

    // Add type-based skills
    if (workItem.type === 'story') {
      skills.push('frontend', 'ui');
    } else if (workItem.type === 'enabler') {
      skills.push('backend', 'infrastructure');
    }

    return Array.from(new Set(skills)); // Remove duplicates
  }

  /**
   * Generate assignment reasoning
   */
  private generateAssignmentReasoning(
    member: TeamMember,
    workItem: PlanningWorkItem,
    allocatedItem: AllocatedWorkItem
  ): string {
    const reasons: string[] = [];

    // Skill-based reasoning
    const requiredSkills = this.extractRequiredSkills(workItem);
    const matchedSkills = requiredSkills.filter(skill => 
      member.skills.some(memberSkill => 
        memberSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    if (matchedSkills.length > 0) {
      reasons.push(`Has relevant skills: ${matchedSkills.slice(0, 3).join(', ')}`);
    }

    // Capacity-based reasoning
    const availableCapacity = member.maxCapacity - member.currentCapacity;
    if (availableCapacity >= allocatedItem.allocatedPoints) {
      reasons.push(`Has sufficient capacity (${availableCapacity} available, ${allocatedItem.allocatedPoints} needed)`);
    } else {
      reasons.push(`Limited capacity (${availableCapacity} available, ${allocatedItem.allocatedPoints} needed)`);
    }

    // Experience-based reasoning
    if (member.skills.length > 3) {
      reasons.push('Experienced team member');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Default assignment';
  }

  /**
   * Load team members from Linear
   */
  private async loadTeamMembers(teams: ARTTeam[]): Promise<void> {
    logger.debug('Loading team members from Linear', {
      teamCount: teams.length
    });

    for (const team of teams) {
      try {
        const linearTeam = await this.linearClient.getTeam(team.id);
        if (!linearTeam) {
          logger.warn('Linear team not found', { teamId: team.id });
          continue;
        }

        const teamMembers = await this.getTeamMembersFromLinear(team.id);
        this.teamMembers.set(team.id, teamMembers);

        logger.debug('Team members loaded', {
          teamId: team.id,
          memberCount: teamMembers.length
        });
      } catch (error) {
        logger.error('Failed to load team members', {
          teamId: team.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.teamMembers.set(team.id, []);
      }
    }

    const totalMembers = Array.from(this.teamMembers.values())
      .reduce((sum, members) => sum + members.length, 0);

    logger.info('All team members loaded', {
      totalTeams: teams.length,
      totalMembers
    });
  }

  /**
   * Get team members from Linear API
   */
  private async getTeamMembersFromLinear(teamId: string): Promise<TeamMember[]> {
    try {
      const linearUsers = await this.linearClient.getTeamMembers(teamId);
      
      return linearUsers.nodes?.map(user => ({
        userId: user.id,
        userName: user.name || user.displayName || 'Unknown',
        email: user.email || '',
        teamId: teamId,
        skills: this.extractSkillsFromUser(user),
        currentCapacity: 0, // Would need to calculate from current assignments
        maxCapacity: 40, // Default 40 hours per week
        timeZone: user.timezone || 'UTC',
        isActive: user.active !== false
      })) || [];
    } catch (error) {
      logger.error('Failed to get team members from Linear', {
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Extract skills from Linear user profile
   */
  private extractSkillsFromUser(user: any): string[] {
    const skills: string[] = [];

    // Extract from user description/bio if available
    const description = user.description || user.bio || '';
    if (description) {
      const skillKeywords = [
        'react', 'vue', 'angular', 'javascript', 'typescript', 'node',
        'python', 'java', 'spring', 'django', 'flask',
        'docker', 'kubernetes', 'aws', 'azure', 'gcp',
        'postgresql', 'mysql', 'mongodb', 'redis',
        'api', 'rest', 'graphql', 'microservices',
        'testing', 'cypress', 'jest', 'junit',
        'devops', 'ci/cd', 'jenkins', 'github actions',
        'design', 'ui', 'ux', 'figma', 'sketch'
      ];

      const lowerDescription = description.toLowerCase();
      for (const keyword of skillKeywords) {
        if (lowerDescription.includes(keyword)) {
          skills.push(keyword);
        }
      }
    }

    // Add role-based skills
    const role = user.role || '';
    if (role.toLowerCase().includes('frontend')) {
      skills.push('frontend', 'javascript', 'react');
    } else if (role.toLowerCase().includes('backend')) {
      skills.push('backend', 'api', 'database');
    } else if (role.toLowerCase().includes('devops')) {
      skills.push('devops', 'docker', 'ci/cd');
    } else if (role.toLowerCase().includes('design')) {
      skills.push('design', 'ui', 'ux');
    }

    return Array.from(new Set(skills)); // Remove duplicates
  }

  /**
   * Get team name by ID
   */
  private getTeamName(teamId: string, teams: ARTTeam[]): string {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : teamId;
  }

  /**
   * Get assignment statistics for reporting
   */
  async getAssignmentStatistics(results: WorkAssignmentResult[]): Promise<{
    totalAssignments: number;
    successfulAssignments: number;
    failedAssignments: number;
    averageConfidence: number;
    teamDistribution: Map<string, number>;
    userDistribution: Map<string, number>;
    warningCounts: Map<string, number>;
  }> {
    const stats = {
      totalAssignments: results.length,
      successfulAssignments: results.filter(r => r.assignmentStatus === 'success').length,
      failedAssignments: results.filter(r => r.assignmentStatus === 'failed').length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / Math.max(results.length, 1),
      teamDistribution: new Map<string, number>(),
      userDistribution: new Map<string, number>(),
      warningCounts: new Map<string, number>()
    };

    // Calculate distributions
    for (const result of results) {
      // Team distribution
      const teamKey = `${result.assignedTeamName} (${result.assignedTeamId})`;
      stats.teamDistribution.set(teamKey, (stats.teamDistribution.get(teamKey) || 0) + 1);

      // User distribution
      if (result.assignedUserId && result.assignedUserName) {
        const userKey = `${result.assignedUserName} (${result.assignedUserId})`;
        stats.userDistribution.set(userKey, (stats.userDistribution.get(userKey) || 0) + 1);
      }

      // Warning counts
      for (const warning of result.warnings) {
        stats.warningCounts.set(warning, (stats.warningCounts.get(warning) || 0) + 1);
      }
    }

    return stats;
  }
}