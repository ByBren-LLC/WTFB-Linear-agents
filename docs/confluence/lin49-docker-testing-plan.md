# LIN-49 ART Iteration Planning - Docker Testing Plan

**Document Type**: Confluence Test Plan  
**Created**: June 30, 2025  
**Author**: ARCHitect (Augment Agent)  
**Target Environment**: Docker PC Production-like Environment  
**Related Issues**: LIN-49, Epic LIN-46  

---

## 📋 **EXECUTIVE SUMMARY**

This comprehensive test plan validates the newly implemented ART (Agile Release Train) Iteration Planning system in a Docker production-like environment. The testing covers end-to-end functionality, performance validation, and real Linear API integration.

**Scope**: Complete validation of 6,649 lines of ART planning implementation including Phase 2 Value Delivery Validation and Phase 3 Linear Integration.

---

## 🎯 **TEST OBJECTIVES**

### **Primary Objectives**
1. **Validate Docker Environment Compatibility** - Ensure all services start and function correctly
2. **End-to-End ART Planning Workflow** - Complete PI planning automation testing
3. **Real Linear API Integration** - Validate actual Linear workspace integration
4. **Performance Benchmarking** - Establish baseline performance metrics
5. **Production Readiness** - Confirm enterprise deployment readiness

### **Success Criteria**
- ✅ All Docker services start without errors
- ✅ ART planning completes for 50+ work items in <500ms
- ✅ Linear integration creates cycles and assigns work items
- ✅ Value delivery validation achieves >80% confidence scores
- ✅ Working software validation passes 4-gate quality pipeline

---

## 🐳 **PHASE 1: DOCKER ENVIRONMENT VALIDATION**

### **Test 1.1: Container Build and Startup**
**Duration**: 15 minutes  
**Prerequisites**: Docker PC with latest code pulled

```bash
# Pull latest code
git checkout dev
git pull origin dev

# Build containers
docker-compose build --no-cache

# Start services
docker-compose up -d

# Verify all services running
docker-compose ps
```

**Expected Results**:
- All containers build successfully
- PostgreSQL database starts and accepts connections
- Application service starts on port 3000
- Health endpoints respond with 200 status

**Validation Commands**:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/health
docker logs wtfb-linear-agents_app_1
```

### **Test 1.2: Database Schema Validation**
**Duration**: 10 minutes

```bash
# Connect to database
docker exec -it wtfb-linear-agents_db_1 psql -U postgres -d linear_agents

# Verify tables exist
\dt

# Check for ART planning related tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

**Expected Results**:
- All required database tables present
- No schema migration errors
- ART planning tables properly created

### **Test 1.3: Environment Configuration**
**Duration**: 5 minutes

```bash
# Verify environment variables
docker exec wtfb-linear-agents_app_1 env | grep -E "(LINEAR|CONFLUENCE)"

# Test Linear API connectivity
docker exec wtfb-linear-agents_app_1 npm run cli -- linear-test-connection
```

**Expected Results**:
- All required environment variables present
- Linear API authentication successful
- Confluence API connectivity confirmed

---

## 🎯 **PHASE 2: ART PLANNING CORE FUNCTIONALITY**

### **Test 2.1: Basic ART Planning Execution**
**Duration**: 30 minutes  
**Prerequisites**: Phase 1 complete, test data prepared

```bash
# Test basic ART planning
docker exec wtfb-linear-agents_app_1 npm run cli art-plan \
  --pi-id="TEST-PI-2025-Q1" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --iterations=6 \
  --dry-run

# Test with real Linear data
docker exec wtfb-linear-agents_app_1 npm run cli art-plan \
  --pi-id="TEST-PI-2025-Q1" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --work-items-count=25
```

**Expected Results**:
- ART planning completes without errors
- 6 iterations created with proper capacity allocation
- Work items distributed based on dependencies
- Capacity utilization stays within 85% threshold

**Validation Points**:
- Iteration structure follows SAFe methodology
- Dependency ordering respected (topological sort)
- Team capacity calculations accurate
- Buffer capacity (20%) properly applied

### **Test 2.2: Story Decomposition Integration**
**Duration**: 20 minutes

```bash
# Test story decomposition
docker exec wtfb-linear-agents_app_1 npm run cli story-decompose \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --max-points=5 \
  --auto-create

# Verify decomposed stories
docker exec wtfb-linear-agents_app_1 npm run cli story-list \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --filter="decomposed"
```

**Expected Results**:
- Large stories (>5 points) automatically decomposed
- Sub-stories maintain parent relationships
- Acceptance criteria properly distributed
- Story points sum correctly

### **Test 2.3: Dependency Mapping Validation**
**Duration**: 25 minutes

```bash
# Test dependency mapping
docker exec wtfb-linear-agents_app_1 npm run cli dependency-map \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --scope="current-pi" \
  --auto-link

# Generate dependency report
docker exec wtfb-linear-agents_app_1 npm run cli dependency-report \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --format=json \
  --output=/tmp/dependencies.json
```

**Expected Results**:
- Dependencies automatically identified
- Circular dependencies detected and reported
- Critical path calculated correctly
- Linear relationships created

---

## 🚀 **PHASE 3: VALUE DELIVERY VALIDATION**

### **Test 3.1: Value Stream Analysis**
**Duration**: 25 minutes

```bash
# Test value delivery analysis
docker exec wtfb-linear-agents_app_1 npm run cli value-analyze \
  --iteration-id="TEST-IT-01" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --output=json

# Test 5-stream taxonomy
docker exec wtfb-linear-agents_app_1 npm run cli value-streams \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --analyze-business-impact
```

**Expected Results**:
- Value streams properly categorized (customer-facing, revenue-generating, etc.)
- Business value quantification with ROI metrics
- User impact assessment with confidence scores
- Value delivery score >80% for customer-facing work

### **Test 3.2: Working Software Validation**
**Duration**: 30 minutes

```bash
# Test working software validation
docker exec wtfb-linear-agents_app_1 npm run cli working-software-validate \
  --iteration-id="TEST-IT-01" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --quality-gates

# Test 4-gate quality pipeline
docker exec wtfb-linear-agents_app_1 npm run cli quality-gates \
  --iteration-id="TEST-IT-01" \
  --gates="code-review,test-coverage,security-scan,performance"
```

**Expected Results**:
- 4-gate quality pipeline executes successfully
- Deployment readiness score >85%
- Integration completeness validation passes
- Rollback strategy properly defined

### **Test 3.3: ART Readiness Optimization**
**Duration**: 20 minutes

```bash
# Test ART readiness assessment
docker exec wtfb-linear-agents_app_1 npm run cli art-validate \
  --pi-id="TEST-PI-2025-Q1" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49"

# Test optimization engine
docker exec wtfb-linear-agents_app_1 npm run cli art-optimize \
  --pi-id="TEST-PI-2025-Q1" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --auto-apply
```

**Expected Results**:
- ART readiness score calculated accurately
- Optimization recommendations generated
- Quick wins identified with effort estimation
- Strategic improvements planned with resource requirements

---

## 🔗 **PHASE 4: LINEAR INTEGRATION TESTING**

### **Test 4.1: Linear Cycle Management**
**Duration**: 25 minutes

```bash
# Test Linear cycle creation
docker exec wtfb-linear-agents_app_1 npm run cli linear-cycles \
  --pi-id="TEST-PI-2025-Q1" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --create-cycles

# Verify cycles in Linear
docker exec wtfb-linear-agents_app_1 npm run cli linear-cycles \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --list
```

**Expected Results**:
- Linear cycles created for each iteration
- Cycle dates align with PI planning timeline
- Cycle goals properly set
- Work items assigned to appropriate cycles

### **Test 4.2: Work Assignment Integration**
**Duration**: 30 minutes

```bash
# Test intelligent work assignment
docker exec wtfb-linear-agents_app_1 npm run cli work-assign \
  --pi-id="TEST-PI-2025-Q1" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --skill-based

# Validate assignments in Linear
docker exec wtfb-linear-agents_app_1 npm run cli assignment-report \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --format=json
```

**Expected Results**:
- Work items assigned based on team member skills
- Capacity constraints respected
- Assignment confidence scores >80%
- Linear issues updated with assignees

---

## 📊 **PHASE 5: PERFORMANCE VALIDATION**

### **Test 5.1: Load Testing**
**Duration**: 45 minutes

```bash
# Test with 50+ work items
docker exec wtfb-linear-agents_app_1 npm run cli art-plan \
  --pi-id="LOAD-TEST-PI" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --work-items-count=75 \
  --measure-performance

# Test with 100+ work items
docker exec wtfb-linear-agents_app_1 npm run cli art-plan \
  --pi-id="STRESS-TEST-PI" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --work-items-count=150 \
  --measure-performance
```

**Performance Targets**:
- 50 work items: <500ms planning time
- 100 work items: <1000ms planning time
- Memory usage: <512MB peak
- Linear API calls: <100 requests per planning session

### **Test 5.2: Concurrent User Testing**
**Duration**: 30 minutes

```bash
# Simulate multiple concurrent planning sessions
for i in {1..5}; do
  docker exec wtfb-linear-agents_app_1 npm run cli art-plan \
    --pi-id="CONCURRENT-PI-$i" \
    --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
    --work-items-count=25 &
done
wait
```

**Expected Results**:
- All concurrent sessions complete successfully
- No database deadlocks or conflicts
- Linear API rate limits respected
- Response times remain within acceptable ranges

---

## 🎯 **PHASE 6: END-TO-END INTEGRATION**

### **Test 6.1: Complete SAFe Workflow**
**Duration**: 60 minutes

```bash
# Complete end-to-end SAFe workflow
# 1. Story decomposition
docker exec wtfb-linear-agents_app_1 npm run cli story-decompose \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" --auto-create

# 2. Dependency mapping
docker exec wtfb-linear-agents_app_1 npm run cli dependency-map \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" --auto-link

# 3. ART planning with optimization
docker exec wtfb-linear-agents_app_1 npm run cli art-plan \
  --pi-id="E2E-TEST-PI" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --enable-value-optimization

# 4. Linear integration
docker exec wtfb-linear-agents_app_1 npm run cli linear-sync \
  --pi-id="E2E-TEST-PI" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --create-cycles --assign-work

# 5. Generate reports
docker exec wtfb-linear-agents_app_1 npm run cli generate-reports \
  --pi-id="E2E-TEST-PI" \
  --team-id="41889e1b-4050-4aea-841a-4c0c37c34a49" \
  --all-formats
```

**Expected Results**:
- Complete SAFe workflow executes without errors
- All phases integrate seamlessly
- Linear workspace reflects ART planning results
- Reports generated successfully

---

## 📋 **TEST EXECUTION CHECKLIST**

### **Pre-Test Setup**
- [ ] Docker PC environment prepared
- [ ] Latest code pulled from dev branch
- [ ] Environment variables configured
- [ ] Test Linear workspace prepared
- [ ] Test data sets ready

### **Test Execution**
- [ ] Phase 1: Docker Environment Validation
- [ ] Phase 2: ART Planning Core Functionality  
- [ ] Phase 3: Value Delivery Validation
- [ ] Phase 4: Linear Integration Testing
- [ ] Phase 5: Performance Validation
- [ ] Phase 6: End-to-End Integration

### **Post-Test Activities**
- [ ] Performance metrics documented
- [ ] Issues identified and logged
- [ ] Test results compiled
- [ ] Recommendations documented
- [ ] Production deployment plan updated

---

## 🚨 **ISSUE ESCALATION**

### **Critical Issues** (Stop Testing)
- Docker containers fail to start
- Database connectivity issues
- Linear API authentication failures
- Core ART planning algorithm failures

### **Major Issues** (Continue with Caution)
- Performance targets not met
- Integration test failures
- Value delivery validation issues
- Working software validation failures

### **Minor Issues** (Document and Continue)
- UI/UX inconsistencies
- Non-critical error messages
- Performance optimizations needed
- Documentation updates required

---

## 📊 **SUCCESS METRICS**

### **Functional Success**
- ✅ 100% of core ART planning tests pass
- ✅ 95% of integration tests pass
- ✅ 90% of performance targets met
- ✅ 100% of critical workflows complete

### **Performance Success**
- ✅ Planning time <500ms for 50 work items
- ✅ Memory usage <512MB peak
- ✅ Linear API rate limits respected
- ✅ Concurrent user support validated

### **Business Success**
- ✅ SAFe methodology compliance validated
- ✅ Value delivery confidence >80%
- ✅ Working software validation >85%
- ✅ Enterprise deployment readiness confirmed

---

**This comprehensive test plan ensures the ART Iteration Planning system is production-ready for enterprise SAFe transformation workflows.**

*Test Plan Version: 1.0*  
*Next Review: After test execution completion*
