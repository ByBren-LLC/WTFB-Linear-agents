# SAFe to Linear Mapping Diagram

## SAFe Hierarchy in Linear

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Linear Issue with [EPIC] label                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  Linear Issue with [FEATURE] label              │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │                                         │   │   │
│  │  │  Linear Issue (Story)                   │   │   │
│  │  │                                         │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                 │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │                                         │   │   │
│  │  │  Linear Issue (Story)                   │   │   │
│  │  │                                         │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  Linear Issue with [FEATURE] label              │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │                                         │   │   │
│  │  │  Linear Issue (Story)                   │   │   │
│  │  │                                         │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                 │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │                                         │   │   │
│  │  │  Linear Issue with [ENABLER] label      │   │   │
│  │  │                                         │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Program Increment Implementation

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Linear Cycle (Program Increment)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  Linear Issue with [FEATURE] label              │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  Linear Issue with [FEATURE] label              │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │  Linear Issue with [ENABLER] label              │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Labeling Strategy

| SAFe Concept | Linear Label |
|--------------|--------------|
| Epic | Epic |
| Feature | Feature |
| Story | (No label needed) |
| Enabler | Enabler |
| Architecture Enabler | Architecture |
| Infrastructure Enabler | Infrastructure |
| Technical Debt Enabler | Technical Debt |
| Research Enabler | Research |
| Business | Business |

## Workflow States Mapping

| SAFe State | Linear State |
|------------|--------------|
| Funnel | Backlog |
| Reviewing | Refinement |
| Analyzing | Refinement |
| Portfolio Backlog | Ready |
| Implementing | In Progress |
| Done | Done |
| Canceled | Canceled |
