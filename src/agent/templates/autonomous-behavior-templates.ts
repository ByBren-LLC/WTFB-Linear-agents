/**
 * Autonomous Behavior Response Templates for Enhanced Response System (LIN-60)
 * 
 * Templates for proactive suggestions and autonomous agent actions.
 */

import { ResponseTemplate, ResponseType } from '../types/response-types';

/**
 * Story decomposition suggestion template
 */
export const storyDecompositionTemplate: ResponseTemplate = {
  id: 'suggestion_story_decomposition',
  name: 'Story Decomposition Suggestion',
  type: ResponseType.SUGGESTION,
  template: `# 🤖 Proactive Suggestion: Story Decomposition

Hi {{teamName}} team! I noticed this story has **{{storyPoints}} story points**, which is above our recommended maximum of {{maxPoints}} points for optimal delivery.

## 📊 Analysis
- **Current Size**: {{storyPoints}} points ({{sizeLabel}})
- **Recommended**: Break into {{recommendedParts}} smaller stories
- **Benefits**: {{benefits}}
- **Risk Level**: {{riskLevel}} if kept as single story

## 💡 Decomposition Suggestions
Based on the story description, I recommend breaking this into:

{{decompositionSuggestions}}

## 📈 Expected Improvements
{{expectedImprovements}}

## 🚀 Next Steps
- **Auto-decompose**: \`@saafepulse decompose this story\`
- **Manual planning**: Use the suggestions above
- **Need help?**: \`@saafepulse help with story decomposition\`

*This is a proactive suggestion to help optimize your workflow. Feel free to ignore if the current size works for your team!*

---
*Proactive suggestion by @saafepulse | Disable: \`@saafepulse config disable story-monitoring\`*`,
  variables: [
    { name: 'teamName', type: 'string', required: false, defaultValue: '' },
    { name: 'storyPoints', type: 'number', required: true },
    { name: 'maxPoints', type: 'number', required: true, defaultValue: 5 },
    { name: 'sizeLabel', type: 'string', required: true },
    { name: 'recommendedParts', type: 'string', required: true },
    { name: 'benefits', type: 'string', required: true },
    { name: 'riskLevel', type: 'string', required: true },
    { name: 'decompositionSuggestions', type: 'string', required: true },
    { name: 'expectedImprovements', type: 'string', required: true }
  ]
};

/**
 * Dependency detection alert template
 */
export const dependencyAlertTemplate: ResponseTemplate = {
  id: 'suggestion_dependency_detected',
  name: 'Dependency Detection Alert',
  type: ResponseType.SUGGESTION,
  template: `# 🔗 Dependencies Detected

I've identified potential dependencies in this {{issueType}} that should be mapped for better tracking and risk management.

## 🔍 Dependencies Found
{{dependenciesList}}

## 📊 Impact Analysis
- **Blocking Issues**: {{blockingCount}}
- **Blocked By**: {{blockedByCount}}
- **Cross-team Dependencies**: {{crossTeamCount}}
- **Risk Level**: {{riskLevel}} {{riskIcon}}

## 🎯 Recommended Actions
{{recommendedActions}}

## 📈 Dependency Visualization
\`\`\`
{{dependencyDiagram}}
\`\`\`

## 🚀 Quick Actions
- **Map all dependencies**: \`@saafepulse map dependencies for this {{issueType}}\`
- **Create dependency report**: \`@saafepulse dependency report\`
- **Schedule sync meeting**: \`@saafepulse schedule dependency sync\`

---
*Proactive dependency detection by @saafepulse | View dependency map: {{dependencyMapLink}}*`,
  variables: [
    { name: 'issueType', type: 'string', required: true },
    { name: 'dependenciesList', type: 'string', required: true },
    { name: 'blockingCount', type: 'number', required: true },
    { name: 'blockedByCount', type: 'number', required: true },
    { name: 'crossTeamCount', type: 'number', required: true },
    { name: 'riskLevel', type: 'string', required: true },
    { name: 'riskIcon', type: 'string', required: false },
    { name: 'recommendedActions', type: 'string', required: true },
    { name: 'dependencyDiagram', type: 'string', required: true },
    { name: 'dependencyMapLink', type: 'string', required: false, defaultValue: '#' }
  ]
};

/**
 * Workflow automation notification template
 */
export const workflowAutomationTemplate: ResponseTemplate = {
  id: 'info_workflow_automated',
  name: 'Workflow Automation Notification',
  type: ResponseType.INFO,
  template: `# ⚡ Workflow Automation Applied

I've automatically updated this issue based on the workflow rules for your team.

## 🔄 Actions Taken
{{actionsList}}

## 📊 Current Status
- **State**: {{currentState}} {{stateIcon}}
- **Labels**: {{currentLabels}}
- **Assignee**: {{assignee}}
- **Priority**: {{priority}}

{{section:notifications}}

{{section:relatedUpdates}}

## 💡 Automation Rules
This automation was triggered by: **{{triggerDescription}}**

To modify automation rules: \`@saafepulse config workflow rules\`

---
*Automated by @saafepulse workflow engine | Undo: \`@saafepulse undo last action\`*`,
  variables: [
    { name: 'actionsList', type: 'string', required: true },
    { name: 'currentState', type: 'string', required: true },
    { name: 'stateIcon', type: 'string', required: false },
    { name: 'currentLabels', type: 'string', required: true },
    { name: 'assignee', type: 'string', required: true },
    { name: 'priority', type: 'string', required: true },
    { name: 'triggerDescription', type: 'string', required: true }
  ],
  sections: [
    {
      name: 'notifications',
      condition: 'hasNotifications === true',
      template: `## 📢 Notifications Sent
{{notificationsList}}`
    },
    {
      name: 'relatedUpdates',
      condition: 'hasRelatedUpdates === true',
      template: `## 🔗 Related Updates
{{relatedUpdatesList}}`
    }
  ]
};

/**
 * ART health monitoring alert template
 */
export const artHealthAlertTemplate: ResponseTemplate = {
  id: 'warning_art_health_issue',
  name: 'ART Health Alert',
  type: ResponseType.WARNING,
  template: `# 🚨 ART Health Alert: {{alertType}}

**Team**: {{teamName}}  
**Severity**: {{severity}} {{severityIcon}}  
**Detected**: {{detectionTime}}

## 🔍 Issue Details
{{issueDescription}}

## 📊 Current Metrics
{{metricsTable}}

## 📈 Trend Analysis
{{trendDescription}}

## 💡 Recommended Actions
{{recommendedActions}}

## 🚀 Immediate Actions Available
- **View detailed analysis**: \`@saafepulse analyze art health\`
- **Generate recovery plan**: \`@saafepulse create recovery plan\`
- **Schedule review meeting**: \`@saafepulse schedule art review\`

{{section:historicalContext}}

---
*ART health monitoring by @saafepulse | Escalate: \`@saafepulse escalate to {{escalationPath}}\`*`,
  variables: [
    { name: 'alertType', type: 'string', required: true },
    { name: 'teamName', type: 'string', required: true },
    { name: 'severity', type: 'string', required: true },
    { name: 'severityIcon', type: 'string', required: false },
    { name: 'detectionTime', type: 'date', required: true },
    { name: 'issueDescription', type: 'string', required: true },
    { name: 'metricsTable', type: 'string', required: true },
    { name: 'trendDescription', type: 'string', required: true },
    { name: 'recommendedActions', type: 'string', required: true },
    { name: 'escalationPath', type: 'string', required: false, defaultValue: 'team-lead' }
  ],
  sections: [
    {
      name: 'historicalContext',
      condition: 'hasHistory === true',
      template: `## 📅 Historical Context
{{historicalData}}`
    }
  ]
};

/**
 * Periodic report template
 */
export const periodicReportTemplate: ResponseTemplate = {
  id: 'report_periodic_summary',
  name: 'Periodic Summary Report',
  type: ResponseType.REPORT,
  template: `# 📊 {{reportType}} Summary: {{teamName}}
*{{reportPeriod}}*

## 🎯 Key Metrics
{{keyMetrics}}

## ✅ {{completedSection}}
{{completedItems}}

## 🚀 {{inProgressSection}}
{{inProgressItems}}

{{section:blockers}}

{{section:upcomingWork}}

## 📈 {{trendSection}}
{{trendAnalysis}}

{{section:insights}}

{{section:recommendations}}

---
*Generated by @saafepulse | Next report: {{nextReportDate}} | Configure: \`@saafepulse config reporting\`*`,
  variables: [
    { name: 'reportType', type: 'string', required: true },
    { name: 'teamName', type: 'string', required: true },
    { name: 'reportPeriod', type: 'string', required: true },
    { name: 'keyMetrics', type: 'string', required: true },
    { name: 'completedSection', type: 'string', required: true, defaultValue: 'Completed This Period' },
    { name: 'completedItems', type: 'string', required: true },
    { name: 'inProgressSection', type: 'string', required: true, defaultValue: 'Currently In Progress' },
    { name: 'inProgressItems', type: 'string', required: true },
    { name: 'trendSection', type: 'string', required: true, defaultValue: 'Trends' },
    { name: 'trendAnalysis', type: 'string', required: true },
    { name: 'nextReportDate', type: 'string', required: true }
  ],
  sections: [
    {
      name: 'blockers',
      condition: 'hasBlockers === true',
      template: `## 🚨 Blockers
{{blockersList}}`
    },
    {
      name: 'upcomingWork',
      condition: 'hasUpcomingWork === true',
      template: `## 📅 Upcoming Work
{{upcomingWorkList}}`
    },
    {
      name: 'insights',
      condition: 'hasInsights === true',
      template: `## 💡 Insights
{{insightsList}}`
    },
    {
      name: 'recommendations',
      condition: 'hasRecommendations === true',
      template: `## 🎯 Recommendations
{{recommendationsList}}`
    }
  ]
};

/**
 * Anomaly detection alert template
 */
export const anomalyAlertTemplate: ResponseTemplate = {
  id: 'warning_anomaly_detected',
  name: 'Anomaly Detection Alert',
  type: ResponseType.WARNING,
  template: `# 🔍 Anomaly Detected: {{anomalyType}}

**Severity**: {{severity}} {{severityIcon}}  
**Confidence**: {{confidence}}%  
**First Detected**: {{detectionTime}}

## 📊 Anomaly Details
{{anomalyDescription}}

## 📈 Statistical Analysis
{{statisticalAnalysis}}

## 🎯 Affected Areas
{{affectedAreas}}

## 💡 Possible Causes
{{possibleCauses}}

## 🚀 Recommended Actions
{{recommendedActions}}

## 🔧 Investigation Tools
- **Deep dive analysis**: \`@saafepulse analyze {{anomalyType}}\`
- **Historical comparison**: \`@saafepulse compare historical data\`
- **Generate report**: \`@saafepulse anomaly report\`

---
*Anomaly detection by @saafepulse | Mark as resolved: \`@saafepulse resolve anomaly {{anomalyId}}\`*`,
  variables: [
    { name: 'anomalyType', type: 'string', required: true },
    { name: 'severity', type: 'string', required: true },
    { name: 'severityIcon', type: 'string', required: false },
    { name: 'confidence', type: 'number', required: true },
    { name: 'detectionTime', type: 'date', required: true },
    { name: 'anomalyDescription', type: 'string', required: true },
    { name: 'statisticalAnalysis', type: 'string', required: true },
    { name: 'affectedAreas', type: 'string', required: true },
    { name: 'possibleCauses', type: 'string', required: true },
    { name: 'recommendedActions', type: 'string', required: true },
    { name: 'anomalyId', type: 'string', required: true }
  ]
};

/**
 * Register all autonomous behavior templates
 */
export function registerAutonomousBehaviorTemplates(engine: any): void {
  engine.registerTemplate(storyDecompositionTemplate);
  engine.registerTemplate(dependencyAlertTemplate);
  engine.registerTemplate(workflowAutomationTemplate);
  engine.registerTemplate(artHealthAlertTemplate);
  engine.registerTemplate(periodicReportTemplate);
  engine.registerTemplate(anomalyAlertTemplate);
}