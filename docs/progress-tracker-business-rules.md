# Progress Tracker Business Rules (LIN-64)

This document outlines the business logic decisions and edge case handling implemented in the Enhanced Progress Tracker system.

## Overview

The Enhanced Progress Tracker addresses critical edge cases identified during LIN-60 implementation, providing robust business rule validation and configurable behavior for enterprise SAFe environments.

## Business Rules

### 1. Zero-Point Story Handling

**Business Rule**: Stories with 0 story points are weighted as 1 point for progress calculation.

**Rationale**: Zero-point stories represent real work that should contribute to progress metrics. Excluding them creates inaccurate progress reporting.

**Configuration**: `progressCalculation.zeroPointStoryWeight` (default: 1)

**Edge Cases Handled**:
- Stories without point estimates
- Quick fixes and hotfixes
- Documentation updates

### 2. Enabler Story Weighting

**Business Rule**: Enabler stories receive a 1.2x multiplier in progress calculations.

**Rationale**: Enablers often require more complex work and provide foundation for future stories, justifying higher weight in progress calculations.

**Configuration**: `progressCalculation.enablerStoryMultiplier` (default: 1.2)

### 3. Moved Story Inclusion

**Business Rule**: Stories moved between iterations are included in progress by default.

**Rationale**: Moved stories represent committed work that should be tracked for accurate velocity and progress reporting.

**Configuration**: `progressCalculation.includeMovedStories` (default: true)

**Edge Cases Handled**:
- Cross-iteration story movement
- Scope changes during PI execution
- Capacity adjustments

### 4. Epic Progress Strategies

**Business Rule**: Three strategies for calculating epic progress:

#### Simple Strategy
- Direct percentage: completed points / total points
- Use case: Straightforward progress tracking

#### Weighted Strategy  
- Weighted by story size: larger stories have more impact
- Formula: Σ(completed_points²) / Σ(total_points²)
- Use case: When story size indicates complexity

#### Milestone Strategy
- Based on epic/feature completion rates
- Formula: completed_epics / total_epics
- Use case: Milestone-driven planning

**Configuration**: `progressCalculation.parentEpicProgressStrategy`

### 5. Dependency Management

**Business Rule**: Stories cannot be marked "Done" if dependencies are incomplete.

**Rationale**: Enforces proper work sequencing and prevents integration issues.

**Configuration**: `stateTransition.requireDependencyCompletion` (default: true)

**Edge Cases Handled**:
- Circular dependencies
- External dependencies
- Dependency state validation

### 6. Partial Epic Completion

**Business Rule**: Epics cannot be marked "Done" with incomplete children by default.

**Rationale**: Maintains epic integrity and prevents false completion signals.

**Configuration**: `stateTransition.allowPartialEpicCompletion` (default: false)

**Edge Cases Handled**:
- Scope reduction scenarios
- Emergency epic closure
- Child story cancellation

### 7. Parent State Cascading

**Business Rule**: Parent epics automatically progress based on child state changes.

**Cascade Rules**:
- Epic moves to "In Progress" when first child starts
- Epic moves to "Done" when all children complete
- Epic moves to "Canceled" when all children canceled

**Configuration**: `stateTransition.autoProgressParentEpics` (default: true)

## Threshold Configuration

### ART Readiness Thresholds

- **Warning**: 85% (configurable)
- **Critical**: 70% (configurable)
- **Excellent**: 95%+

### Capacity Utilization Thresholds

- **Maximum**: 95% (warning when exceeded)
- **Minimum**: 70% (info when below)

### Progress Variance Threshold

- **Threshold**: 15% variance between simple and weighted progress
- **Action**: Generate alert for review

## Error Handling and Integration

### Linear API Retry Logic

**Configuration**:
- Retry attempts: 3 (test), 5 (production)
- Backoff multiplier: 2x
- Maximum delay: 5 minutes

**Error Types Handled**:
- Rate limiting (429 errors)
- Network timeouts
- Temporary server errors
- Connection failures

### Concurrent Update Strategies

#### Merge Strategy (default)
- Wait for existing operation
- Re-execute to get fresh data
- Prevents data corruption

#### Latest Strategy
- Cancel previous operation
- Use latest request
- Optimizes for recency

#### Conflict Strategy
- Throw error on concurrent access
- Requires explicit conflict resolution
- Maximum data consistency

## Monitoring and Alerting

### Business Rule Tracking

All business rule applications are logged with:
- Rule name and parameters
- Decision rationale
- Performance impact
- Edge case frequency

### Alert Generation

**Critical Alerts**:
- ART readiness below 70%
- Failed dependency validation
- Epic completion violations

**Warning Alerts**:
- ART readiness below 85%
- High capacity utilization (>95%)
- Active blockers when starting work

**Info Alerts**:
- Low capacity utilization (<70%)
- High progress variance (>15%)
- Empty work item sets

## Environment-Specific Configuration

### Production Environment
- Higher thresholds (90% ART readiness warning)
- More retry attempts (5)
- Faster metrics collection (30s)
- Stricter validation

### Test Environment
- Lower retry attempts (1)
- Faster timeouts (1s)
- Frequent metrics collection (1s)
- Relaxed validation

### Development Environment
- Default configuration
- Moderate retry attempts (3)
- Standard timeouts (5s)
- Balanced validation

## Configuration Validation

All configurations are validated on startup and update:

### Validation Rules
- Warning thresholds must exceed critical thresholds
- Capacity max must exceed capacity min
- Variance thresholds must be 0-100%
- Retry attempts must be non-negative
- Backoff delays must be reasonable

### Invalid Configuration Handling
- Startup failure with clear error messages
- Configuration update rejection
- Fallback to default values where possible

## Implementation Notes

### Performance Considerations
- Configuration caching for frequently accessed rules
- Lazy evaluation of complex calculations
- Batch processing for large work item sets
- Memory-efficient progress tracking

### Backward Compatibility
- Graceful degradation for missing fields
- Default value provision for new configurations
- Migration path for existing progress data

### Security Considerations
- Input sanitization for all work item data
- Rate limiting protection
- Audit logging for business rule changes
- Access control for configuration updates

## Future Enhancements

### Planned Features
- Machine learning for adaptive thresholds
- Custom business rule engine
- Real-time progress streaming
- Advanced analytics and forecasting

### Extension Points
- Custom progress calculation strategies
- Pluggable alert handlers
- External system integrations
- Business rule versioning

---

This documentation serves as the authoritative guide for Progress Tracker business logic and should be updated whenever business rules change.