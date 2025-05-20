/**
 * Program Increment (PI) Model
 * 
 * This module defines the data models for Program Increments and related concepts
 * in SAFe methodology.
 */

/**
 * Program Increment (PI) in SAFe methodology
 * 
 * A Program Increment is a time-boxed planning interval, typically 8-12 weeks long,
 * that provides a development cadence for Agile Release Trains (ARTs).
 */
export interface ProgramIncrement {
  /** Unique identifier for the Program Increment */
  id: string;
  
  /** Name of the Program Increment (e.g., "PI-2023-Q1") */
  name: string;
  
  /** Start date of the Program Increment */
  startDate: Date;
  
  /** End date of the Program Increment */
  endDate: Date;
  
  /** Optional description of the Program Increment */
  description?: string;
  
  /** IDs of features assigned to this Program Increment */
  features: string[];
  
  /** Status of the Program Increment */
  status: 'planning' | 'execution' | 'completed';
}

/**
 * PI Planning event in SAFe methodology
 * 
 * PI Planning is a face-to-face event where teams plan the next Program Increment.
 */
export interface PIPlanning {
  /** Unique identifier for the PI Planning event */
  id: string;
  
  /** ID of the Program Increment this planning event is for */
  piId: string;
  
  /** Start date of the PI Planning event */
  startDate: Date;
  
  /** End date of the PI Planning event */
  endDate: Date;
  
  /** IDs of teams participating in the PI Planning event */
  teams: string[];
  
  /** IDs of features being planned in the PI Planning event */
  features: string[];
  
  /** Status of the PI Planning event */
  status: 'planning' | 'completed';
}

/**
 * PI Iteration in SAFe methodology
 * 
 * A PI consists of multiple iterations, typically 4-5 execution iterations
 * plus an Innovation and Planning (IP) iteration.
 */
export interface PIIteration {
  /** Unique identifier for the PI Iteration */
  id: string;
  
  /** ID of the Program Increment this iteration is part of */
  piId: string;
  
  /** Iteration number within the PI */
  number: number;
  
  /** Start date of the iteration */
  startDate: Date;
  
  /** End date of the iteration */
  endDate: Date;
  
  /** Whether this is an Innovation and Planning (IP) iteration */
  isInnovationAndPlanning: boolean;
  
  /** IDs of stories assigned to this iteration */
  stories: string[];
}

/**
 * PI Feature in SAFe methodology
 * 
 * A Feature assigned to a specific Program Increment.
 */
export interface PIFeature {
  /** Unique identifier for the PI Feature */
  id: string;
  
  /** ID of the Program Increment this feature is assigned to */
  piId: string;
  
  /** ID of the feature in Linear */
  featureId: string;
  
  /** ID of the team responsible for implementing this feature */
  teamId: string;
  
  /** Status of the feature within the PI */
  status: 'planned' | 'in-progress' | 'completed';
  
  /** Confidence level (1-5) for completing the feature within the PI */
  confidence: 1 | 2 | 3 | 4 | 5;
  
  /** IDs of features this feature depends on */
  dependencies: string[];
}

/**
 * PI Objective in SAFe methodology
 * 
 * PI Objectives are a summary of the business and technical goals that an
 * Agile Team or train intends to achieve in the upcoming Program Increment.
 */
export interface PIObjective {
  /** Unique identifier for the PI Objective */
  id: string;
  
  /** ID of the Program Increment this objective is for */
  piId: string;
  
  /** ID of the team responsible for this objective */
  teamId: string;
  
  /** Description of the objective */
  description: string;
  
  /** Business value (1-10) of achieving this objective */
  businessValue: number;
  
  /** Status of the objective */
  status: 'planned' | 'in-progress' | 'completed';
  
  /** IDs of features associated with this objective */
  features: string[];
}

/**
 * PI Risk in SAFe methodology
 * 
 * Risks identified during PI Planning that may impact the ability to meet PI Objectives.
 */
export interface PIRisk {
  /** Unique identifier for the PI Risk */
  id: string;
  
  /** ID of the Program Increment this risk is associated with */
  piId: string;
  
  /** Description of the risk */
  description: string;
  
  /** Impact of the risk (1-5) */
  impact: 1 | 2 | 3 | 4 | 5;
  
  /** Likelihood of the risk occurring (1-5) */
  likelihood: 1 | 2 | 3 | 4 | 5;
  
  /** Status of the risk */
  status: 'identified' | 'mitigated' | 'accepted' | 'avoided';
  
  /** Mitigation plan for the risk */
  mitigationPlan?: string;
}
