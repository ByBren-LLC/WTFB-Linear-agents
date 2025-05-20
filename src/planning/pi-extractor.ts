/**
 * Program Increment (PI) Extractor
 * 
 * This module extracts Program Increment information from Confluence documents.
 */
import { ProgramIncrement, PIFeature, PIObjective, PIRisk } from '../safe/pi-model';
import * as logger from '../utils/logger';

/**
 * Represents a parsed element from a Confluence document
 */
export interface ParsedElement {
  type: string;
  content: string;
  attributes?: Record<string, string>;
  children?: ParsedElement[];
  level?: number;
}

/**
 * Represents a section of a Confluence document
 */
export interface DocumentSection {
  title: string;
  level: number;
  content: ParsedElement[];
  subsections: DocumentSection[];
}

/**
 * Extracts Program Increment information from Confluence documents
 */
export class PIExtractor {
  private document: ParsedElement[];
  private sections: DocumentSection[];

  /**
   * Creates a new PIExtractor instance
   * 
   * @param document - The parsed Confluence document
   * @param sections - The document sections
   */
  constructor(document: ParsedElement[], sections: DocumentSection[]) {
    this.document = document;
    this.sections = sections;
  }

  /**
   * Extracts Program Increments from the document
   * 
   * @returns Array of Program Increments
   */
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

      logger.info('Extracted Program Increments', { count: pis.length });
      return pis;
    } catch (error) {
      logger.error('Error extracting Program Increments', { error });
      return [];
    }
  }

  /**
   * Extracts PI Features from the document
   * 
   * @param piId - ID of the Program Increment
   * @returns Array of PI Features
   */
  extractPIFeatures(piId: string): PIFeature[] {
    try {
      const features: PIFeature[] = [];

      // Look for feature sections in the document
      const featureSections = this.findFeatureSections();

      for (const section of featureSections) {
        // Extract feature information from the section
        const feature = this.extractFeatureFromSection(section, piId);
        
        if (feature) {
          features.push(feature);
        }
      }

      logger.info('Extracted PI Features', { piId, count: features.length });
      return features;
    } catch (error) {
      logger.error('Error extracting PI Features', { error, piId });
      return [];
    }
  }

  /**
   * Extracts PI Objectives from the document
   * 
   * @param piId - ID of the Program Increment
   * @param teamId - ID of the team
   * @returns Array of PI Objectives
   */
  extractPIObjectives(piId: string, teamId: string): PIObjective[] {
    try {
      const objectives: PIObjective[] = [];

      // Look for objective sections in the document
      const objectiveSections = this.findObjectiveSections();

      for (const section of objectiveSections) {
        // Extract objective information from the section
        const objective = this.extractObjectiveFromSection(section, piId, teamId);
        
        if (objective) {
          objectives.push(objective);
        }
      }

      logger.info('Extracted PI Objectives', { piId, count: objectives.length });
      return objectives;
    } catch (error) {
      logger.error('Error extracting PI Objectives', { error, piId });
      return [];
    }
  }

  /**
   * Extracts PI Risks from the document
   * 
   * @param piId - ID of the Program Increment
   * @returns Array of PI Risks
   */
  extractPIRisks(piId: string): PIRisk[] {
    try {
      const risks: PIRisk[] = [];

      // Look for risk sections in the document
      const riskSections = this.findRiskSections();

      for (const section of riskSections) {
        // Extract risk information from the section
        const risk = this.extractRiskFromSection(section, piId);
        
        if (risk) {
          risks.push(risk);
        }
      }

      logger.info('Extracted PI Risks', { piId, count: risks.length });
      return risks;
    } catch (error) {
      logger.error('Error extracting PI Risks', { error, piId });
      return [];
    }
  }

  /**
   * Finds sections in the document that contain Program Increment information
   * 
   * @returns Array of document sections
   */
  private findPISections(): DocumentSection[] {
    // Look for sections with titles that match PI patterns
    const piSections = this.sections.filter(section => {
      const title = section.title.toLowerCase();
      return (
        title.includes('program increment') ||
        title.includes('pi ') ||
        title.match(/pi-\d+/) ||
        title.match(/pi \d+/) ||
        title.match(/pi\d+/)
      );
    });

    return piSections;
  }

  /**
   * Finds sections in the document that contain Feature information
   * 
   * @returns Array of document sections
   */
  private findFeatureSections(): DocumentSection[] {
    // Look for sections with titles that match Feature patterns
    const featureSections = this.sections.filter(section => {
      const title = section.title.toLowerCase();
      return (
        title.includes('feature') ||
        title.includes('features')
      );
    });

    return featureSections;
  }

  /**
   * Finds sections in the document that contain Objective information
   * 
   * @returns Array of document sections
   */
  private findObjectiveSections(): DocumentSection[] {
    // Look for sections with titles that match Objective patterns
    const objectiveSections = this.sections.filter(section => {
      const title = section.title.toLowerCase();
      return (
        title.includes('objective') ||
        title.includes('objectives') ||
        title.includes('pi objective') ||
        title.includes('pi objectives')
      );
    });

    return objectiveSections;
  }

  /**
   * Finds sections in the document that contain Risk information
   * 
   * @returns Array of document sections
   */
  private findRiskSections(): DocumentSection[] {
    // Look for sections with titles that match Risk patterns
    const riskSections = this.sections.filter(section => {
      const title = section.title.toLowerCase();
      return (
        title.includes('risk') ||
        title.includes('risks') ||
        title.includes('pi risk') ||
        title.includes('pi risks')
      );
    });

    return riskSections;
  }

  /**
   * Extracts Program Increment information from a document section
   * 
   * @param section - The document section
   * @returns The extracted Program Increment, or null if extraction failed
   */
  private extractPIFromSection(section: DocumentSection): ProgramIncrement | null {
    try {
      // Extract PI name from section title
      const name = this.extractPINameFromTitle(section.title);
      
      if (!name) {
        logger.warn('Could not extract PI name from section title', { title: section.title });
        return null;
      }
      
      // Extract PI dates from section content
      const dates = this.extractDateRange(section);
      
      if (!dates) {
        logger.warn('Could not extract PI dates from section content', { title: section.title });
        return null;
      }
      
      // Extract PI description from section content
      const description = this.extractDescription(section);
      
      // Extract feature IDs from section content
      const features = this.extractFeatureIds(section);
      
      // Create a PI object with a temporary ID
      // The actual ID will be assigned when the PI is created in Linear
      const pi: ProgramIncrement = {
        id: `temp-${Date.now()}`,
        name,
        startDate: dates.startDate,
        endDate: dates.endDate,
        description,
        features,
        status: this.getPIStatus(dates.startDate, dates.endDate)
      };
      
      return pi;
    } catch (error) {
      logger.error('Error extracting PI from section', { error, title: section.title });
      return null;
    }
  }

  /**
   * Extracts Feature information from a document section
   * 
   * @param section - The document section
   * @param piId - ID of the Program Increment
   * @returns The extracted PI Feature, or null if extraction failed
   */
  private extractFeatureFromSection(section: DocumentSection, piId: string): PIFeature | null {
    try {
      // Extract feature title from section title
      const title = section.title;
      
      // Extract feature description from section content
      const description = this.extractDescription(section);
      
      // Extract team ID from section content (if available)
      const teamId = this.extractTeamId(section) || 'unknown';
      
      // Extract dependencies from section content
      const dependencies = this.extractDependencies(section);
      
      // Create a PIFeature object with a temporary ID
      // The actual ID will be assigned when the feature is created in Linear
      const feature: PIFeature = {
        id: `temp-${Date.now()}`,
        piId,
        featureId: `temp-feature-${Date.now()}`,
        teamId,
        status: 'planned',
        confidence: 3, // Default confidence
        dependencies
      };
      
      return feature;
    } catch (error) {
      logger.error('Error extracting feature from section', { error, title: section.title });
      return null;
    }
  }

  /**
   * Extracts Objective information from a document section
   * 
   * @param section - The document section
   * @param piId - ID of the Program Increment
   * @param teamId - ID of the team
   * @returns The extracted PI Objective, or null if extraction failed
   */
  private extractObjectiveFromSection(section: DocumentSection, piId: string, teamId: string): PIObjective | null {
    try {
      // Extract objective description from section title or content
      const description = section.title;
      
      // Extract business value from section content
      const businessValue = this.extractBusinessValue(section);
      
      // Extract feature IDs from section content
      const features = this.extractFeatureIds(section);
      
      // Create a PIObjective object with a temporary ID
      // The actual ID will be assigned when the objective is created in Linear
      const objective: PIObjective = {
        id: `temp-${Date.now()}`,
        piId,
        teamId,
        description,
        businessValue: businessValue || 5, // Default business value
        status: 'planned',
        features
      };
      
      return objective;
    } catch (error) {
      logger.error('Error extracting objective from section', { error, title: section.title });
      return null;
    }
  }

  /**
   * Extracts Risk information from a document section
   * 
   * @param section - The document section
   * @param piId - ID of the Program Increment
   * @returns The extracted PI Risk, or null if extraction failed
   */
  private extractRiskFromSection(section: DocumentSection, piId: string): PIRisk | null {
    try {
      // Extract risk description from section title or content
      const description = section.title;
      
      // Extract impact and likelihood from section content
      const impact = this.extractImpact(section);
      const likelihood = this.extractLikelihood(section);
      
      // Extract mitigation plan from section content
      const mitigationPlan = this.extractMitigationPlan(section);
      
      // Create a PIRisk object with a temporary ID
      // The actual ID will be assigned when the risk is created in Linear
      const risk: PIRisk = {
        id: `temp-${Date.now()}`,
        piId,
        description,
        impact: impact || 3, // Default impact
        likelihood: likelihood || 3, // Default likelihood
        status: 'identified',
        mitigationPlan
      };
      
      return risk;
    } catch (error) {
      logger.error('Error extracting risk from section', { error, title: section.title });
      return null;
    }
  }

  /**
   * Extracts PI name from a section title
   * 
   * @param title - The section title
   * @returns The extracted PI name, or null if extraction failed
   */
  private extractPINameFromTitle(title: string): string | null {
    // Look for patterns like "PI-2023-Q1", "PI 2023 Q1", etc.
    const piPattern = /PI[-\s]?(\d{4}[-\s]?Q[1-4]|\d+)/i;
    const match = title.match(piPattern);
    
    if (match) {
      return `PI-${match[1].replace(/\s/g, '')}`;
    }
    
    // If no specific pattern is found, use the title as is
    return title;
  }

  /**
   * Extracts a date range from a document section
   * 
   * @param section - The document section
   * @returns The extracted date range, or null if extraction failed
   */
  private extractDateRange(section: DocumentSection): { startDate: Date; endDate: Date } | null {
    // Look for date patterns in the section content
    for (const element of section.content) {
      if (element.type === 'paragraph' || element.type === 'table') {
        const content = typeof element.content === 'string' ? element.content : JSON.stringify(element.content);
        
        // Look for date ranges like "Jan 1, 2023 - Mar 31, 2023", "2023-01-01 to 2023-03-31", etc.
        const dateRangePattern = /(\d{4}-\d{2}-\d{2}|\w+ \d{1,2},? \d{4})\s*[-–—to]\s*(\d{4}-\d{2}-\d{2}|\w+ \d{1,2},? \d{4})/i;
        const match = content.match(dateRangePattern);
        
        if (match) {
          const startDate = new Date(match[1]);
          const endDate = new Date(match[2]);
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            return { startDate, endDate };
          }
        }
      }
    }
    
    // If no date range is found, create a default range (current quarter)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 3);
    endDate.setDate(endDate.getDate() - 1);
    
    return { startDate, endDate };
  }

  /**
   * Extracts a description from a document section
   * 
   * @param section - The document section
   * @returns The extracted description
   */
  private extractDescription(section: DocumentSection): string {
    // Concatenate all paragraph content in the section
    const paragraphs = section.content
      .filter(element => element.type === 'paragraph')
      .map(element => typeof element.content === 'string' ? element.content : JSON.stringify(element.content));
    
    return paragraphs.join('\n\n');
  }

  /**
   * Extracts feature IDs from a document section
   * 
   * @param section - The document section
   * @returns Array of feature IDs
   */
  private extractFeatureIds(section: DocumentSection): string[] {
    // This is a placeholder implementation
    // In a real implementation, you would look for feature references in the section content
    return [];
  }

  /**
   * Extracts a team ID from a document section
   * 
   * @param section - The document section
   * @returns The extracted team ID, or null if extraction failed
   */
  private extractTeamId(section: DocumentSection): string | null {
    // This is a placeholder implementation
    // In a real implementation, you would look for team references in the section content
    return null;
  }

  /**
   * Extracts dependencies from a document section
   * 
   * @param section - The document section
   * @returns Array of dependency IDs
   */
  private extractDependencies(section: DocumentSection): string[] {
    // This is a placeholder implementation
    // In a real implementation, you would look for dependency references in the section content
    return [];
  }

  /**
   * Extracts business value from a document section
   * 
   * @param section - The document section
   * @returns The extracted business value, or null if extraction failed
   */
  private extractBusinessValue(section: DocumentSection): number | null {
    // Look for business value patterns in the section content
    for (const element of section.content) {
      if (element.type === 'paragraph' || element.type === 'table') {
        const content = typeof element.content === 'string' ? element.content : JSON.stringify(element.content);
        
        // Look for patterns like "Business Value: 8", "BV: 8/10", etc.
        const bvPattern = /business value:?\s*(\d+)(?:\s*\/\s*10)?|bv:?\s*(\d+)(?:\s*\/\s*10)?/i;
        const match = content.match(bvPattern);
        
        if (match) {
          const value = parseInt(match[1] || match[2], 10);
          
          if (!isNaN(value) && value >= 1 && value <= 10) {
            return value;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extracts impact from a document section
   * 
   * @param section - The document section
   * @returns The extracted impact, or null if extraction failed
   */
  private extractImpact(section: DocumentSection): 1 | 2 | 3 | 4 | 5 | null {
    // Look for impact patterns in the section content
    for (const element of section.content) {
      if (element.type === 'paragraph' || element.type === 'table') {
        const content = typeof element.content === 'string' ? element.content : JSON.stringify(element.content);
        
        // Look for patterns like "Impact: 4", "Impact: 4/5", etc.
        const impactPattern = /impact:?\s*(\d+)(?:\s*\/\s*5)?/i;
        const match = content.match(impactPattern);
        
        if (match) {
          const value = parseInt(match[1], 10);
          
          if (!isNaN(value) && value >= 1 && value <= 5) {
            return value as 1 | 2 | 3 | 4 | 5;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extracts likelihood from a document section
   * 
   * @param section - The document section
   * @returns The extracted likelihood, or null if extraction failed
   */
  private extractLikelihood(section: DocumentSection): 1 | 2 | 3 | 4 | 5 | null {
    // Look for likelihood patterns in the section content
    for (const element of section.content) {
      if (element.type === 'paragraph' || element.type === 'table') {
        const content = typeof element.content === 'string' ? element.content : JSON.stringify(element.content);
        
        // Look for patterns like "Likelihood: 3", "Likelihood: 3/5", etc.
        const likelihoodPattern = /likelihood:?\s*(\d+)(?:\s*\/\s*5)?/i;
        const match = content.match(likelihoodPattern);
        
        if (match) {
          const value = parseInt(match[1], 10);
          
          if (!isNaN(value) && value >= 1 && value <= 5) {
            return value as 1 | 2 | 3 | 4 | 5;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extracts a mitigation plan from a document section
   * 
   * @param section - The document section
   * @returns The extracted mitigation plan
   */
  private extractMitigationPlan(section: DocumentSection): string | undefined {
    // Look for mitigation plan patterns in the section content
    for (const element of section.content) {
      if (element.type === 'paragraph' || element.type === 'table') {
        const content = typeof element.content === 'string' ? element.content : JSON.stringify(element.content);
        
        // Look for patterns like "Mitigation Plan:", "Mitigation:", etc.
        const mitigationPattern = /mitigation(?:\s+plan)?:?\s*(.*)/i;
        const match = content.match(mitigationPattern);
        
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    return undefined;
  }

  /**
   * Determines the status of a Program Increment based on its dates
   * 
   * @param startDate - Start date of the Program Increment
   * @param endDate - End date of the Program Increment
   * @returns The status of the Program Increment
   */
  private getPIStatus(startDate: Date, endDate: Date): 'planning' | 'execution' | 'completed' {
    const now = new Date();
    
    if (now < startDate) {
      return 'planning';
    } else if (now <= endDate) {
      return 'execution';
    } else {
      return 'completed';
    }
  }
}
