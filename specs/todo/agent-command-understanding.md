# Agent Command Understanding - Story Specification

**Story ID**: LIN-58 (created in Linear)
**Epic**: LIN-56 Linear Agent Interactive Capabilities
**Story Points**: 8 (MUST be decomposed into sub-stories ≤5 points each)
**Priority**: High (1)
**Type**: Feature
**⚠️ DECOMPOSITION REQUIRED**: Use story decomposition system before implementation

## 📋 **USER STORY**

**As a** Linear workspace user
**I want** to execute ART planning operations through natural language commands to the SAFe PULSE agent in both Linear and Slack
**So that** I can access sophisticated planning capabilities without leaving my workflow or learning CLI syntax

## 🎯 **PROBLEM STATEMENT**

The SAFe PULSE agent has sophisticated ART planning capabilities (6,649+ lines) accessible only through CLI commands. Users must:
- Leave Linear to execute planning operations
- Learn complex CLI syntax and parameters
- Context-switch between Linear issues and terminal commands
- Manually correlate CLI results with Linear issues
- Miss real-time notifications and team coordination

**Current State**: ART planning requires CLI expertise and context switching
**Desired State**: Natural language commands execute ART planning in Linear with Slack notifications

**⚠️ IMPLEMENTATION REQUIREMENT**: This 8-point story MUST be decomposed into sub-stories ≤5 points each before implementation. Use the existing story decomposition system.

## ✅ **ACCEPTANCE CRITERIA**

### **Core Command Categories**

#### **ART Planning Commands**
- [ ] `@saafepulse plan this PI` - Execute ART iteration planning for current PI
- [ ] `@saafepulse plan PI [name]` - Execute ART planning for specific PI
- [ ] `@saafepulse optimize ART` - Run ART readiness optimization
- [ ] `@saafepulse validate ART readiness` - Check ART readiness score

#### **Value Delivery Commands**
- [ ] `@saafepulse analyze value delivery` - Run value delivery analysis
- [ ] `@saafepulse check working software` - Validate working software readiness
- [ ] `@saafepulse show value streams` - Display value stream categorization

#### **Story Management Commands**
- [ ] `@saafepulse decompose this story` - Decompose current issue if >5 points
- [ ] `@saafepulse map dependencies` - Map dependencies for current issue/epic
- [ ] `@saafepulse score this story` - Apply WSJF scoring to current issue

#### **Status and Information Commands**
- [ ] `@saafepulse status` - Show current ART status and health
- [ ] `@saafepulse help` - Display available commands and usage
- [ ] `@saafepulse show iterations` - Display current iteration plan

### **Natural Language Processing**
- [ ] **Intent Recognition**: Accurately identify command intent from natural language
- [ ] **Parameter Extraction**: Extract team IDs, PI names, iteration numbers from context
- [ ] **Context Awareness**: Use issue context (team, project, labels) for parameters
- [ ] **Fuzzy Matching**: Handle variations in command phrasing
- [ ] **Error Handling**: Provide helpful suggestions for unrecognized commands

### **Response Requirements**
- [ ] **Linear Response**: Rich markdown comment in the issue with detailed results
- [ ] **Slack Notification**: Summary notification via existing OperationalNotificationCoordinator
- [ ] **Progress Updates**: Show progress for long-running operations in both channels
- [ ] **Result Summaries**: Provide actionable summaries of planning results
- [ ] **Error Messages**: Clear, actionable error messages with suggestions
- [ ] **Follow-up Actions**: Suggest next steps after command completion
- [ ] **Cross-Platform Links**: Slack notifications include Linear issue links
- [ ] **Conditional Alerts**: Slack alerts for important conditions (ART health <85%, etc.)

## 🔧 **TECHNICAL IMPLEMENTATION**

### **Command Parser Architecture**
```typescript
// src/agent/command-parser.ts
export interface ParsedCommand {
  intent: CommandIntent;
  parameters: CommandParameters;
  confidence: number;
  context: IssueContext;
}

export enum CommandIntent {
  ART_PLAN = 'art_plan',
  ART_OPTIMIZE = 'art_optimize',
  VALUE_ANALYZE = 'value_analyze',
  STORY_DECOMPOSE = 'story_decompose',
  DEPENDENCY_MAP = 'dependency_map',
  STATUS_CHECK = 'status_check',
  HELP = 'help',
  UNKNOWN = 'unknown'
}

export class AgentCommandParser {
  private intentPatterns: Map<CommandIntent, RegExp[]>;
  
  constructor() {
    this.initializePatterns();
  }
  
  parseCommand(text: string, context: IssueContext): ParsedCommand {
    // Clean and normalize input
    const normalizedText = this.normalizeText(text);
    
    // Extract intent
    const intent = this.extractIntent(normalizedText);
    
    // Extract parameters
    const parameters = this.extractParameters(normalizedText, intent, context);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(normalizedText, intent);
    
    return {
      intent,
      parameters,
      confidence,
      context
    };
  }
  
  private initializePatterns(): void {
    this.intentPatterns = new Map([
      [CommandIntent.ART_PLAN, [
        /plan\s+(this\s+)?pi/i,
        /execute\s+art\s+planning/i,
        /create\s+iteration\s+plan/i
      ]],
      [CommandIntent.VALUE_ANALYZE, [
        /analyze\s+value\s+delivery/i,
        /check\s+value\s+streams/i,
        /value\s+analysis/i
      ]],
      [CommandIntent.STORY_DECOMPOSE, [
        /decompose\s+(this\s+)?story/i,
        /break\s+down\s+(this\s+)?story/i,
        /split\s+(this\s+)?story/i
      ]],
      // ... more patterns
    ]);
  }
}
```

### **Command Executor**
```typescript
// src/agent/command-executor.ts
export class ARTCommandExecutor {
  constructor(
    private linearClient: LinearClientWrapper,
    private cliExecutor: CLIExecutor
  ) {}
  
  async executeCommand(command: ParsedCommand): Promise<AgentResponse> {
    try {
      switch (command.intent) {
        case CommandIntent.ART_PLAN:
          return await this.executeARTPlan(command);
        case CommandIntent.VALUE_ANALYZE:
          return await this.executeValueAnalysis(command);
        case CommandIntent.STORY_DECOMPOSE:
          return await this.executeStoryDecomposition(command);
        default:
          return this.createUnknownCommandResponse(command);
      }
    } catch (error) {
      return this.createErrorResponse(command, error);
    }
  }
  
  private async executeARTPlan(command: ParsedCommand): Promise<AgentResponse> {
    // Extract parameters
    const { teamId, piId } = this.extractARTPlanParameters(command);
    
    // Execute CLI command
    const cliResult = await this.cliExecutor.execute('art-plan', {
      'pi-id': piId,
      'team-id': teamId,
      'output': 'json'
    });
    
    // Format response
    return this.formatARTPlanResponse(cliResult);
  }
}
```

### **CLI Integration Bridge**
```typescript
// src/agent/cli-executor.ts
export class CLIExecutor {
  async execute(command: string, options: Record<string, any>): Promise<any> {
    // Convert to CLI arguments
    const args = this.buildCLIArgs(command, options);
    
    // Execute CLI command internally (not via shell)
    const result = await this.executeInternalCLI(command, args);
    
    return result;
  }
  
  private async executeInternalCLI(command: string, args: any): Promise<any> {
    // Direct integration with existing CLI modules
    switch (command) {
      case 'art-plan':
        const artPlanner = new ARTPlanner(/* ... */);
        return await artPlanner.planART(/* args */);
      case 'value-analyze':
        const valueAnalyzer = new ValueDeliveryAnalyzer(/* ... */);
        return await valueAnalyzer.analyzeValueDelivery(/* args */);
      // ... other commands
    }
  }
}
```

## 📊 **COMMAND SPECIFICATIONS**

### **ART Planning Commands**

#### **`@saafepulse plan this PI`**
```typescript
// Input: "@saafepulse plan this PI"
// Context: Issue in team "LIN", current PI "PI-2025-Q1"
// Execution: art-plan --pi-id="PI-2025-Q1" --team-id="LIN"
// Response:
```
```markdown
# ART Planning Complete ✅

**PI**: PI-2025-Q1  
**Team**: Linear Agents  
**Iterations**: 6 planned  
**Work Items**: 127 allocated  

## Planning Results
- 🎯 **Value Delivery Score**: 87% (Excellent)
- ⚡ **ART Readiness**: 92% (Ready for execution)
- 📈 **Capacity Utilization**: 83% (Optimal)

## Key Highlights
- All high-priority features allocated to early iterations
- 3 dependency conflicts resolved automatically
- 15% improvement in capacity utilization vs. previous PI

## Next Steps
- Review iteration plans in Linear cycles
- Validate team assignments
- Begin iteration execution

[View Detailed Plan](link) | [Optimization Report](link)
```

#### **`@saafepulse decompose this story`**
```typescript
// Input: "@saafepulse decompose this story"
// Context: Issue with 8 story points
// Execution: story-decompose --story-id="ISSUE-123" --max-points=5
// Response:
```
```markdown
# Story Decomposition Complete ✅

**Original Story**: "Implement user authentication system" (8 points)

## Decomposed Stories Created
1. **LIN-124**: "Design authentication API endpoints" (3 points)
2. **LIN-125**: "Implement JWT token management" (3 points)  
3. **LIN-126**: "Create user login/logout UI" (2 points)

## Decomposition Analysis
- ✅ All sub-stories ≤ 5 points (SAFe compliant)
- ✅ Acceptance criteria distributed appropriately
- ✅ Dependencies maintained between sub-stories
- ✅ Original story updated with decomposition links

## Next Steps
- Review sub-story acceptance criteria
- Assign sub-stories to team members
- Plan sub-stories across iterations

[View Sub-Stories](link) | [Decomposition Report](link)
```

### **Parameter Extraction Examples**
```typescript
// Context-aware parameter extraction
"@saafepulse plan this PI" 
// → piId: extracted from issue context or current PI
// → teamId: extracted from issue team

"@saafepulse plan PI-2025-Q2 for team DEV"
// → piId: "PI-2025-Q2" (explicit)
// → teamId: "DEV" (explicit)

"@saafepulse analyze value delivery for current iteration"
// → iterationId: extracted from current iteration context
// → teamId: extracted from issue team
```

## 🧪 **TESTING STRATEGY**

### **Unit Tests**
```typescript
// tests/agent/command-parser.test.ts
describe('AgentCommandParser', () => {
  it('should parse ART planning commands', () => {
    const parser = new AgentCommandParser();
    const result = parser.parseCommand(
      '@saafepulse plan this PI',
      mockIssueContext
    );
    
    expect(result.intent).toBe(CommandIntent.ART_PLAN);
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.parameters.piId).toBeDefined();
  });
  
  it('should handle command variations', () => {
    const variations = [
      'plan this PI',
      'execute ART planning',
      'create iteration plan for this PI'
    ];
    
    variations.forEach(command => {
      const result = parser.parseCommand(command, mockIssueContext);
      expect(result.intent).toBe(CommandIntent.ART_PLAN);
    });
  });
});
```

### **Integration Tests**
```typescript
// tests/agent/command-integration.test.ts
describe('Command Integration', () => {
  it('should execute ART planning end-to-end', async () => {
    const executor = new ARTCommandExecutor(mockLinearClient, mockCLIExecutor);
    const command = {
      intent: CommandIntent.ART_PLAN,
      parameters: { piId: 'PI-2025-Q1', teamId: 'LIN' },
      confidence: 0.95,
      context: mockIssueContext
    };
    
    const response = await executor.executeCommand(command);
    
    expect(response.success).toBe(true);
    expect(response.message).toContain('ART Planning Complete');
    expect(mockCLIExecutor.execute).toHaveBeenCalledWith('art-plan', {
      'pi-id': 'PI-2025-Q1',
      'team-id': 'LIN'
    });
  });
});
```

## 📈 **SUCCESS METRICS**

### **Technical Metrics**
- **Intent Recognition Accuracy**: >95% for supported commands
- **Parameter Extraction Accuracy**: >90% for context-dependent parameters
- **Command Execution Success Rate**: >98% for valid commands
- **Response Time**: <5 seconds for simple commands, <30 seconds for complex operations

### **User Experience Metrics**
- **Command Usage**: % of agent interactions using commands vs. casual mentions
- **Command Success**: % of commands that produce expected results
- **User Satisfaction**: Feedback on command usefulness and ease of use
- **Error Recovery**: % of failed commands that provide helpful error messages

## 🔄 **INTEGRATION POINTS**

### **Webhook Processors Integration**
```typescript
// Enhanced webhook processor with command detection
export class IssueMentionProcessor extends BaseWebhookProcessor {
  async process(notification: AppUserNotification): Promise<void> {
    const mentionText = this.extractMentionText(notification);
    
    // Parse for commands
    const command = this.commandParser.parseCommand(mentionText, context);
    
    if (command.confidence > 0.8) {
      // Execute command
      const response = await this.commandExecutor.executeCommand(command);
      await this.createResponse(notification.issue.id, response.message, 'comment');
    } else {
      // Standard acknowledgment
      await this.createAcknowledgmentResponse(notification);
    }
  }
}
```

### **Future Autonomous Behaviors**
- Command patterns will inform autonomous behavior triggers
- Command success metrics will guide autonomous action confidence
- Command parameter extraction will be reused for autonomous context awareness

## 🚀 **DEPLOYMENT PLAN**

### **Phase 1: Core Commands (Day 1-3)**
- Implement command parser with basic intent recognition
- Support ART planning and help commands
- Integration with webhook processors

### **Phase 2: Advanced Commands (Day 4-5)**
- Add value delivery and story management commands
- Implement parameter extraction and context awareness
- Enhanced response formatting

### **Phase 3: Polish and Testing (Day 6-7)**
- Comprehensive testing and error handling
- Performance optimization
- User experience refinement

**This implementation transforms the SAFe PULSE agent from a CLI tool into an intelligent Linear workspace assistant, making sophisticated ART planning accessible through natural language.** 🚀
