# Webhook Response Examples Catalog

This document provides comprehensive examples of SAFe PULSE agent responses for different Linear webhook events, contexts, and scenarios.

## Table of Contents

1. [Issue Mention Responses](#issue-mention-responses)
2. [Comment Mention Responses](#comment-mention-responses)
3. [Assignment Responses](#assignment-responses)
4. [Status Change Responses](#status-change-responses)
5. [Reaction Responses](#reaction-responses)
6. [New Comment Responses](#new-comment-responses)

---

## Issue Mention Responses

### Basic Mention
**Trigger**: `@saafepulse` in issue description

```markdown
👋 Hello @jane!

I'm SAFe PULSE, your AI-powered planning assistant. I can help you with:
• Breaking down stories into manageable tasks
• Estimating story points using SAFe guidelines
• Managing dependencies and blockers
• Tracking PI objectives and progress
• Analyzing team velocity and capacity

To get started, just describe what you need help with or use one of these commands:
• "Help me estimate this story"
• "Break this down into smaller tasks"
• "What are the dependencies?"
• "Analyze our team velocity"

I'm here to support your Agile Release Train planning! 🚂

---
_SAFe PULSE Agent • @jane_
```

### Urgent Issue Mention
**Context**: Priority 1 (Urgent) issue

```markdown
🚨 Hello @john! I see this is an URGENT issue.

I'm SAFe PULSE, ready to help expedite this critical work. Given the urgency, I recommend:
• Immediate dependency analysis
• Risk assessment
• Resource allocation review
• Fast-track estimation

Let me know how I can assist with this high-priority item!

---
_SAFe PULSE Agent • Urgent Support • @john_
```

---

## Comment Mention Responses

### Follow-up Question
**Trigger**: Second mention in comments
**Context**: Previous interaction exists

```markdown
Welcome back @sarah! 👋

I see we're continuing our discussion on **LIN-789: API Integration**.

Based on our previous conversation about estimation, here's where we left off:
• Initial estimate: 8 points
• Identified risks: External API dependencies
• Suggested breakdown into 3 sub-tasks

What specific aspect would you like to explore further?

---
_SAFe PULSE Agent • Continuing Support • @sarah_
```

### Help Request
**Trigger**: `@saafepulse help`

```markdown
Hi @mike! I'm here to help. 🎯

For **LIN-234: Implement user authentication**, I can assist with:

**Planning & Estimation**
• `/estimate` - Analyze and suggest story points
• `/breakdown` - Decompose into smaller tasks
• `/dependencies` - Map related work items

**SAFe Guidance**
• `/pi-fit` - Check if this fits in current PI
• `/value-stream` - Analyze value delivery
• `/acceptance` - Review acceptance criteria

**Team Support**
• `/capacity` - Check team availability
• `/similar` - Find similar completed stories
• `/risks` - Identify potential blockers

Just let me know what you need!

---
_SAFe PULSE Agent • Help Menu • @mike_
```

---

## Assignment Responses

### New Assignment - Small Story
**Event**: Issue assigned to SAFe PULSE
**Context**: 3-point story, ready state

```markdown
🎯 I've been assigned to **LIN-345: Update configuration schema**

Great! This is a well-sized story (3 points) that's ready to start. I'll help track progress and ensure smooth delivery.

✅ **Automatic Actions Taken:**
• Status updated: Backlog → In Progress
• Added to current sprint tracking

📋 **Quick Analysis:**
• Size: Appropriate for single sprint
• Type: Technical enhancement
• Dependencies: None identified

Let me know if you need help with implementation details or have questions!

---
_SAFe PULSE Agent • Assignment Acknowledged • 3 story points_
```

### New Assignment - Large Story
**Context**: 13-point story

```markdown
🎯 I've been assigned to **LIN-567: Redesign reporting module**

I notice this is a large story (13 points). According to SAFe best practices, stories over 8 points should be decomposed.

⚠️ **Recommendations:**
• Break down into 3-4 smaller stories
• Each story should be 3-5 points
• Maintain clear acceptance criteria
• Consider vertical slicing

Would you like me to suggest a breakdown structure? I can help create sub-stories that:
• Deliver incremental value
• Reduce risk
• Improve flow
• Enable parallel work

---
_SAFe PULSE Agent • Large Story Alert • 13 story points_
```

### Unassignment
**Event**: Issue unassigned from SAFe PULSE

```markdown
👋 I've been unassigned from **LIN-890: Database migration**

**Summary of my involvement:**
• Duration: 3 days assigned
• Progress tracked: Design phase completed
• Last update: Architecture review pending

The issue remains in "In Progress" status. Consider assigning to another team member to maintain momentum.

Good luck with the continued development!

---
_SAFe PULSE Agent • Assignment Completed_
```

---

## Status Change Responses

### Progress Update
**Event**: Status changed to "In Progress"

```markdown
📈 Progress update from @developer:

**LIN-123: Implement payment gateway** is now **In Progress**. Good to see this moving forward!

Keep up the great work! Let me know if you need assistance with the next steps.

---
_SAFe PULSE Agent • Status Tracking • @developer_
```

### Completion
**Event**: Status changed to "Done"
**Context**: 5-point story with estimate

```markdown
🎉 Great news @teamlead!

**LIN-456: User profile enhancement** has been marked as **Done**. Excellent work on completing this task!

📊 **Work Summary**
• Story Points: 5
• Final Status: Done
• Delivery: On schedule

This completion contributes to our PI objectives. Great job delivering value!

---
_SAFe PULSE Agent • Status Tracking • @teamlead_
```

### Blocked Status
**Event**: Status changed to "Blocked"
**Context**: Urgent issue

```markdown
🚨 Attention @productowner,

**LIN-789: Critical security patch** has been moved to **Blocked**. This appears to be blocked or canceled.

**🎯 Suggested Actions**
• Review blockers
• Consider alternative approaches
• Urgent issue needs attention
• Escalate if necessary

**Common Resolution Strategies:**
• Identify specific blocker (technical/dependency/resource)
• Document in blocker field
• Schedule sync with stakeholders
• Consider workarounds

I'm here to help if you need assistance resolving any blockers or planning next steps.

---
_SAFe PULSE Agent • Blocker Alert • @productowner_
```

---

## Reaction Responses

### Question Context Reaction
**Event**: Reaction on comment with question
**Context**: Assigned issue, comment contains "?"

```markdown
👋 Thanks for the reaction, @reviewer!

I see you've reacted to a comment in **LIN-901: API refactoring**.

If you have any questions or need clarification on the discussion, feel free to @mention me directly and I'll be happy to help!

---
_SAFe PULSE Agent • Engagement Tracking_
```

### High Priority Reaction
**Event**: Reaction on urgent issue
**Context**: Priority 1, assigned to agent

```markdown
👋 Thanks for the reaction, @stakeholder!

I appreciate your engagement with **LIN-critical: System outage recovery**.

This high-priority issue is actively being tracked. Your engagement helps prioritize our response. If you have specific concerns or updates, please share them!

---
_SAFe PULSE Agent • Engagement Tracking_
```

---

## New Comment Responses

### Direct Question
**Event**: New comment with question and mention
**Comment**: "@saafepulse can you help estimate this work?"

```markdown
Hi @engineer,

Thanks for reaching out! I see you have a question about **LIN-234: Database optimization**.

For estimation questions, I can help analyze the scope and suggest story point values based on SAFe guidelines.

**To provide accurate estimation, I'll need:**
• Clear acceptance criteria
• Technical complexity assessment
• Dependencies identification
• Similar story reference points

**Quick Estimation Framework:**
• 1-2 points: Simple, well-understood changes
• 3-5 points: Moderate complexity, some unknowns
• 8 points: Complex, multiple components
• 13+ points: Should be decomposed

Based on the current description, this appears to be moderate complexity (3-5 points), but let's review the details together.

---
_SAFe PULSE Agent • Collaborative Planning_
```

### Blocker Notification
**Event**: New comment mentioning blockers
**Comment**: "@saafepulse We have a blocker - the API is broken and returning errors"

```markdown
Hi @developer,

Thanks for reaching out! I see you're dealing with blockers. I see you have a question about **LIN-567: Integration feature**.

For blockers, I can help identify dependencies and suggest resolution strategies.

I understand you're facing challenges. Let's work together to resolve them.

**Immediate Actions:**
1. Document the specific API errors
2. Check if this blocks other team members
3. Consider temporary workarounds
4. Escalate if critical path impacted

**Support Available:**
• Technical investigation assistance
• Alternative approach brainstorming
• Dependency impact analysis
• Stakeholder communication templates

What specific aspect of the blocker would you like to tackle first?

---
_SAFe PULSE Agent • Collaborative Planning_
```

### Progress Update Response
**Event**: New comment with status update
**Context**: Assigned issue, no direct mention

```markdown
Hi @team,

Thanks for the progress update on **LIN-789: Feature implementation**.

Since this is in progress, I can help with:
• Tracking progress and blockers
• Suggesting implementation approaches
• Coordinating with team members

Keep up the great work! Let me know if any challenges arise.

---
_SAFe PULSE Agent • Collaborative Planning_
```

---

## Response Patterns

### Professional Tone
- Always greet by username
- Acknowledge the context
- Provide specific, actionable help
- Close with signature line

### Context Awareness
- Reference issue title and ID
- Acknowledge priority/urgency
- Recognize conversation history
- Adapt to issue state

### Value Delivery
- Offer specific assistance
- Provide SAFe guidance
- Suggest next steps
- Enable self-service

### Engagement Rules
- Respond to direct mentions
- Acknowledge assigned issues
- Track high-priority items
- Avoid notification spam