/**
 * Planning State Management
 * 
 * This module defines the state management types and interfaces for planning sessions.
 */

export interface PlanningSession {
  id: string;
  name: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  description?: string;
  confluencePageId?: string;
  linearProjectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanningSessionState {
  currentSession?: PlanningSession;
  sessions: PlanningSession[];
  isLoading: boolean;
  error?: string;
}

export interface PlanningDocument {
  id: string;
  title: string;
  content: string;
  features?: Feature[];
  stories?: Story[];
  enablers?: Enabler[];
  metadata?: Record<string, any>;
  lastModified: Date;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  priority: number;
  team?: string;
  state?: string;
  stories?: Story[];
  acceptanceCriteria?: string[];
  businessValue?: string;
  dependencies?: string[];
}

export interface Story {
  id: string;
  title: string;
  description: string;
  priority: number;
  team?: string;
  state?: string;
  featureId?: string;
  acceptanceCriteria?: string[];
  storyPoints?: number;
  dependencies?: string[];
}

export interface Enabler {
  id: string;
  title: string;
  description: string;
  type: 'architecture' | 'infrastructure' | 'technical_debt' | 'research';
  priority: number;
  team?: string;
  state?: string;
  dependencies?: string[];
}

export interface PlanningAction {
  type: string;
  payload?: any;
}

export interface PlanningState {
  sessions: PlanningSessionState;
  documents: PlanningDocument[];
  currentDocument?: PlanningDocument;
  isProcessing: boolean;
  error?: string;
}

// Action types
export const PLANNING_ACTIONS = {
  SET_CURRENT_SESSION: 'SET_CURRENT_SESSION',
  ADD_SESSION: 'ADD_SESSION',
  UPDATE_SESSION: 'UPDATE_SESSION',
  DELETE_SESSION: 'DELETE_SESSION',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CURRENT_DOCUMENT: 'SET_CURRENT_DOCUMENT',
  ADD_DOCUMENT: 'ADD_DOCUMENT',
  UPDATE_DOCUMENT: 'UPDATE_DOCUMENT',
  DELETE_DOCUMENT: 'DELETE_DOCUMENT',
  SET_PROCESSING: 'SET_PROCESSING'
} as const;

// Initial state
export const initialPlanningState: PlanningState = {
  sessions: {
    sessions: [],
    isLoading: false
  },
  documents: [],
  isProcessing: false
};

// State reducer
export function planningReducer(state: PlanningState, action: PlanningAction): PlanningState {
  switch (action.type) {
    case PLANNING_ACTIONS.SET_CURRENT_SESSION:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          currentSession: action.payload
        }
      };
    
    case PLANNING_ACTIONS.ADD_SESSION:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          sessions: [...state.sessions.sessions, action.payload]
        }
      };
    
    case PLANNING_ACTIONS.UPDATE_SESSION:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          sessions: state.sessions.sessions.map(session =>
            session.id === action.payload.id ? { ...session, ...action.payload } : session
          )
        }
      };
    
    case PLANNING_ACTIONS.DELETE_SESSION:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          sessions: state.sessions.sessions.filter(session => session.id !== action.payload)
        }
      };
    
    case PLANNING_ACTIONS.SET_LOADING:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          isLoading: action.payload
        }
      };
    
    case PLANNING_ACTIONS.SET_ERROR:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          error: action.payload
        }
      };
    
    case PLANNING_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          error: undefined
        }
      };
    
    case PLANNING_ACTIONS.SET_CURRENT_DOCUMENT:
      return {
        ...state,
        currentDocument: action.payload
      };
    
    case PLANNING_ACTIONS.ADD_DOCUMENT:
      return {
        ...state,
        documents: [...state.documents, action.payload]
      };
    
    case PLANNING_ACTIONS.UPDATE_DOCUMENT:
      return {
        ...state,
        documents: state.documents.map(doc =>
          doc.id === action.payload.id ? { ...doc, ...action.payload } : doc
        )
      };
    
    case PLANNING_ACTIONS.DELETE_DOCUMENT:
      return {
        ...state,
        documents: state.documents.filter(doc => doc.id !== action.payload)
      };
    
    case PLANNING_ACTIONS.SET_PROCESSING:
      return {
        ...state,
        isProcessing: action.payload
      };
    
    default:
      return state;
  }
}
