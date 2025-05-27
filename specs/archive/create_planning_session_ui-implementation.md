# Create Planning Session UI - Implementation Document

## Overview

This user story will implement the user interface for creating and managing planning sessions. This component will provide a web interface for users to initiate planning sessions, select Confluence documents, and monitor the progress of planning sessions.

## User Story

As a user of the Linear Planning Agent, I need a user interface to create and manage planning sessions so that I can easily initiate the process of creating Linear issues from Confluence documents.

## Acceptance Criteria

1. The UI allows users to create a new planning session
2. The UI allows users to select a Confluence document by URL or search
3. The UI displays the progress of the planning session
4. The UI shows errors and warnings during the planning session
5. The UI allows users to view the results of the planning session
6. The UI allows users to view past planning sessions
7. The UI is responsive and works on desktop and mobile devices
8. The UI is accessible and follows web accessibility guidelines
9. The implementation is well-tested with unit tests
10. The implementation is well-documented with JSDoc comments

## Technical Context

The Linear Planning Agent needs a user interface for users to create and manage planning sessions. This interface will allow users to select Confluence documents, initiate planning sessions, and monitor the progress of planning sessions.

### Existing Code

- `src/planning/session-manager.ts`: Planning session manager (to be implemented in the Create Linear Issues from Planning Data task)
- `src/db/models.ts`: Database models for storing planning sessions

### Dependencies

- Planning Session State Management (User Story)
- Create Linear Issues from Planning Data (User Story)

## Implementation Plan

### 1. Set Up Frontend Framework

- Create a new directory `src/ui` for UI components
- Set up React and TypeScript for the frontend
- Configure webpack or another bundler for building the frontend

```typescript
// src/ui/index.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

### 2. Implement App Component

- Create a new file `src/ui/App.tsx` for the main app component
- Implement the main app structure and routing

```typescript
// src/ui/App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { NewSession } from './pages/NewSession';
import { SessionDetails } from './pages/SessionDetails';
import { SessionList } from './pages/SessionList';
import { NotFound } from './pages/NotFound';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="app">
              <Header />
              <main className="main-content">
                <Switch>
                  <Route exact path="/" component={Home} />
                  <Route path="/sessions/new" component={NewSession} />
                  <Route path="/sessions/:id" component={SessionDetails} />
                  <Route path="/sessions" component={SessionList} />
                  <Route component={NotFound} />
                </Switch>
              </main>
              <Footer />
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
```

### 3. Implement New Session Page

- Create a new file `src/ui/pages/NewSession.tsx` for the new session page
- Implement a form for creating a new planning session

```typescript
// src/ui/pages/NewSession.tsx
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ConfluenceSearch } from '../components/ConfluenceSearch';
import { createPlanningSession } from '../api/planning';

export const NewSession: React.FC = () => {
  const [title, setTitle] = useState('');
  const [confluenceUrl, setConfluenceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !confluenceUrl) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const session = await createPlanningSession({
        title,
        confluenceUrl,
        organizationId: user?.organizationId || ''
      });
      
      showToast('Planning session created successfully', 'success');
      history.push(`/sessions/${session.id}`);
    } catch (error) {
      showToast(`Error creating planning session: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="new-session-page">
      <h1>Create New Planning Session</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Session Title</label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for this planning session"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confluenceUrl">Confluence Document URL</label>
          <Input
            id="confluenceUrl"
            value={confluenceUrl}
            onChange={(e) => setConfluenceUrl(e.target.value)}
            placeholder="Enter the URL of the Confluence document"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Or Search for a Confluence Document</label>
          <ConfluenceSearch onSelect={(url) => setConfluenceUrl(url)} />
        </div>
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Planning Session'}
        </Button>
      </form>
    </div>
  );
};
```

### 4. Implement Session Details Page

- Create a new file `src/ui/pages/SessionDetails.tsx` for the session details page
- Implement a page for viewing the details and progress of a planning session

```typescript
// src/ui/pages/SessionDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { IssueList } from '../components/IssueList';
import { ErrorList } from '../components/ErrorList';
import { getPlanningSession, startPlanningSession } from '../api/planning';

interface SessionDetailsParams {
  id: string;
}

export const SessionDetails: React.FC = () => {
  const { id } = useParams<SessionDetailsParams>();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await getPlanningSession(id);
        setSession(data);
      } catch (err) {
        setError(`Error loading session: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
    
    // Set up polling for session updates
    const interval = setInterval(fetchSession, 5000);
    
    return () => clearInterval(interval);
  }, [id]);

  const handleStartProcessing = async () => {
    setIsProcessing(true);
    
    try {
      await startPlanningSession(id);
      showToast('Planning session started successfully', 'success');
    } catch (err) {
      showToast(`Error starting planning session: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="session-details-page">
      <h1>{session.title}</h1>
      
      <div className="session-info">
        <p><strong>Status:</strong> {session.status}</p>
        <p><strong>Created:</strong> {new Date(session.created_at).toLocaleString()}</p>
        <p><strong>Confluence Document:</strong> <a href={session.confluence_page_url} target="_blank" rel="noopener noreferrer">{session.confluence_page_url}</a></p>
      </div>
      
      {session.status === 'pending' && (
        <Button onClick={handleStartProcessing} disabled={isProcessing}>
          {isProcessing ? 'Starting...' : 'Start Processing'}
        </Button>
      )}
      
      {session.status === 'processing' && (
        <div className="processing-status">
          <h2>Processing</h2>
          <ProgressBar progress={session.progress || 0} />
          <p>{session.progress_message || 'Processing...'}</p>
        </div>
      )}
      
      {session.status === 'completed' && (
        <div className="completed-status">
          <h2>Completed</h2>
          <p>Processing completed successfully.</p>
          
          <h3>Created Issues</h3>
          <IssueList issues={session.issues || []} />
        </div>
      )}
      
      {session.status === 'failed' && (
        <div className="failed-status">
          <h2>Failed</h2>
          <p>Processing failed with errors.</p>
          
          <h3>Errors</h3>
          <ErrorList errors={session.errors || []} />
        </div>
      )}
    </div>
  );
};
```

### 5. Implement Session List Page

- Create a new file `src/ui/pages/SessionList.tsx` for the session list page
- Implement a page for viewing past planning sessions

```typescript
// src/ui/pages/SessionList.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { SessionCard } from '../components/SessionCard';
import { getPlanningSessionsByOrganization } from '../api/planning';

export const SessionList: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await getPlanningSessionsByOrganization(user?.organizationId || '');
        setSessions(data);
      } catch (err) {
        setError(`Error loading sessions: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="session-list-page">
      <div className="header-actions">
        <h1>Planning Sessions</h1>
        <Link to="/sessions/new">
          <Button>Create New Session</Button>
        </Link>
      </div>
      
      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>No planning sessions found.</p>
          <p>Create a new planning session to get started.</p>
        </div>
      ) : (
        <div className="session-grid">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 6. Implement API Client

- Create a new file `src/ui/api/planning.ts` for the planning API client
- Implement functions for interacting with the planning API

```typescript
// src/ui/api/planning.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const createPlanningSession = async (data: {
  title: string;
  confluenceUrl: string;
  organizationId: string;
}) => {
  const response = await api.post('/planning/sessions', data);
  return response.data;
};

export const getPlanningSession = async (id: string) => {
  const response = await api.get(`/planning/sessions/${id}`);
  return response.data;
};

export const getPlanningSessionsByOrganization = async (organizationId: string) => {
  const response = await api.get('/planning/sessions', {
    params: { organizationId }
  });
  return response.data;
};

export const startPlanningSession = async (id: string) => {
  const response = await api.post(`/planning/sessions/${id}/start`);
  return response.data;
};

export const searchConfluencePages = async (query: string) => {
  const response = await api.get('/confluence/search', {
    params: { query }
  });
  return response.data;
};
```

### 7. Implement UI Components

- Create reusable UI components for the planning session UI
- Implement components for forms, buttons, progress bars, etc.

```typescript
// src/ui/components/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  className,
  ...props
}) => {
  return (
    <button
      className={`button button-${variant} button-${size} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

// src/ui/components/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  error,
  className,
  ...props
}) => {
  return (
    <div className="input-wrapper">
      <input
        className={`input ${error ? 'input-error' : ''} ${className || ''}`}
        {...props}
      />
      {error && <div className="input-error-message">{error}</div>}
    </div>
  );
};

// src/ui/components/ProgressBar.tsx
import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className
}) => {
  return (
    <div className={`progress-bar ${className || ''}`}>
      <div
        className="progress-bar-fill"
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
      <div className="progress-bar-text">{Math.round(progress)}%</div>
    </div>
  );
};
```

### 8. Write Tests

- Write unit tests for all components
- Write integration tests for the UI
- Test with various scenarios and edge cases

```typescript
// tests/ui/pages/NewSession.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewSession } from '../../../src/ui/pages/NewSession';
import { createPlanningSession } from '../../../src/ui/api/planning';

// Mock the API client
jest.mock('../../../src/ui/api/planning');

describe('NewSession', () => {
  // Test cases
});

// tests/ui/components/Button.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../../src/ui/components/Button';

describe('Button', () => {
  // Test cases
});
```

### 9. Document the API

- Add JSDoc comments to all functions and components
- Create a README.md file for the UI
- Document usage examples and limitations

## Testing Approach

- Unit tests for all components
- Integration tests for the UI
- Test with various scenarios and edge cases
- Test accessibility with automated tools
- Test responsiveness on different screen sizes

## Definition of Done

- All acceptance criteria are met
- All tests are passing
- Code is well-documented with JSDoc comments
- A README.md file is created for the UI
- The implementation is reviewed and approved by the team

## Estimated Effort

- 5 story points (approximately 5 days of work)

## Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)
