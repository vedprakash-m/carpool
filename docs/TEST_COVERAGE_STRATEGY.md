# VCarpool Test Coverage Strategy

## Comprehensive Test Plan Aligned with Product Specification

**Current Status**: 3.2% Backend Coverage, 11.96% Frontend Coverage  
**Target**: 85%+ Coverage on Core Business Logic  
**Priority**: Deployed Azure Functions & Core User Journeys

---

## 🎯 **Phase 1: Critical Business Logic Coverage** (Week 1)

### **1.1 Azure Functions - Core API Endpoints (0% → 85%)**

All 11 deployed functions need comprehensive test coverage:

#### **Authentication Functions**

- `auth-register-simple` - User registration with role validation
- `auth-login-simple` - JWT token generation and validation
- `auth-refresh-token` - Token refresh lifecycle
- `auth-forgot-password` - Password reset flow
- `auth-reset-password` - Secure password reset validation

#### **User Management Functions**

- `users-me` - User profile retrieval with JWT validation
- `users-update` - Profile update with input sanitization
- `users-change-password` - Password change with security validation

#### **Trip Management Functions**

- `trips-create` - Trip creation with business rule validation
- `trips-list` - Trip listing with pagination and filtering
- `trips-stats` - Trip analytics and reporting

### **1.2 Service Layer Enhancement (Current: 23.89% → 85%)**

#### **AuthService Improvements** (Current: 62.5%)

- ✅ Password hashing (12-round bcrypt) - COVERED
- ✅ JWT token generation - COVERED
- ❌ Token validation edge cases - MISSING
- ❌ Password reset token generation - MISSING
- ❌ Role-based access control - MISSING

#### **TripService Enhancement** (Current: 23.89%)

- ✅ Trip creation - COVERED
- ✅ Passenger management - COVERED
- ❌ 5-step scheduling algorithm - MISSING
- ❌ Business rule validation - MISSING
- ❌ Historical fairness tracking - MISSING

---

## 🔄 **Phase 2: School Carpool Business Rules** (Week 2)

### **2.1 5-Step Scheduling Algorithm Coverage**

_Core VCarpool differentiator - ZERO current coverage_

```typescript
// Test Coverage Requirements:
describe("VCarpool 5-Step Algorithm", () => {
  // Step 1: Exclude unavailable drivers
  it("should filter out drivers marked unavailable");

  // Step 2: Assign preferable slots (max 3/week)
  it("should prioritize preferable preferences");
  it("should enforce 3 preferable slot limit");

  // Step 3: Less-preferable slots (max 2/week)
  it("should use less-preferable for secondary assignments");
  it("should enforce 2 less-preferable slot limit");

  // Step 4: Fill neutral slots
  it("should use neutral slots for remaining assignments");

  // Step 5: Historical tie-breaking
  it("should consider past assignment counts for fairness");
  it("should maintain long-term fairness distribution");
});
```

### **2.2 School-Specific Business Rules**

```typescript
describe("School Carpool Requirements", () => {
  it("should enforce Wednesday 5PM submission deadline");
  it("should validate parent-child relationships");
  it("should support multiple school locations");
  it("should handle grade-based route segregation");
  it("should validate driver eligibility (active parents only)");
  it("should enforce 3 Preferable + 2 Less-Preferable + 2 Unavailable limits");
});
```

---

## 🌐 **Phase 3: Frontend Integration Tests** (Week 3)

### **3.1 API Client Simplification**

_Current: 17 failing tests due to mocking complexity_

**New Strategy**: Focus on business logic, not implementation details

```typescript
describe("API Client - Business Requirements", () => {
  it("should handle authentication flow correctly");
  it("should manage token lifecycle properly");
  it("should provide consistent error handling");
  it("should support all VCarpool API endpoints");
  it("should handle network failures gracefully");
});
```

### **3.2 Critical User Journey Tests**

```typescript
describe("Parent User Journey", () => {
  it("should complete registration → login → preference submission");
  it("should view weekly schedule assignments");
  it("should receive trip notifications");
});

describe("Student User Journey", () => {
  it("should complete profile setup");
  it("should view assigned trips");
  it("should update availability status");
});

describe("Admin User Journey", () => {
  it("should generate weekly schedules");
  it("should view system analytics");
  it("should manage user accounts");
});
```

---

## 📊 **Test Coverage Targets by Component**

| Component                | Current | Target | Priority       | Tests Needed   |
| ------------------------ | ------- | ------ | -------------- | -------------- |
| **Azure Functions**      | 0%      | 85%    | 🔴 Critical    | 45 new tests   |
| **AuthService**          | 62.5%   | 90%    | 🟡 Important   | 8 new tests    |
| **TripService**          | 23.89%  | 85%    | 🔴 Critical    | 25 new tests   |
| **Scheduling Algorithm** | 0%      | 95%    | 🔴 Critical    | 30 new tests   |
| **API Client**           | 32.4%   | 80%    | 🟡 Important   | 15 fixed tests |
| **Frontend Components**  | 0%      | 70%    | 🟢 Enhancement | 20 new tests   |

---

## 🛠️ **Implementation Strategy**

### **Week 1: Foundation (Azure Functions)**

```bash
# Create function-specific test files
./backend/src/__tests__/functions/
├── auth-register.test.ts          # User registration validation
├── auth-login.test.ts             # Authentication flow
├── trips-create.test.ts           # Trip creation business rules
├── trips-stats.test.ts            # Analytics and reporting
└── scheduling-algorithm.test.ts   # Core 5-step algorithm
```

### **Week 2: Business Logic (Services)**

```bash
# Enhance existing service tests
./backend/src/__tests__/services/
├── auth.service.enhanced.test.ts  # Role-based access control
├── trip.service.enhanced.test.ts  # Scheduling integration
└── notification.service.test.ts   # Email/SMS notifications
```

### **Week 3: Integration (Frontend)**

```bash
# Fix and enhance frontend tests
./frontend/src/__tests__/
├── integration/user-journeys.test.ts
├── components/trip-management.test.ts
└── lib/api-client.simplified.test.ts
```

---

## 🎯 **Test Categories by VCarpool Requirements**

### **Functional Requirements Coverage**

- ✅ **User Authentication** (62.5% - Auth service working)
- ❌ **Weekly Scheduling** (0% - Core algorithm missing)
- ❌ **Preference Management** (0% - Form validation missing)
- ❌ **Trip Assignment** (23% - Partial service coverage)
- ❌ **Notifications** (0% - Email service untested)

### **Technical Requirements Coverage**

- ✅ **Security** (62% - JWT + bcrypt working)
- ❌ **Performance** (0% - No load testing)
- ❌ **Scalability** (0% - Azure function scaling untested)
- ❌ **Data Integrity** (0% - Database constraint testing missing)

### **Business Rules Coverage**

- ❌ **5-Step Algorithm** (0% - Core differentiator missing)
- ❌ **Fairness Distribution** (0% - Historical tracking missing)
- ❌ **Role-Based Access** (0% - Admin/Parent/Student permissions)
- ❌ **School Calendar Integration** (0% - Deadline enforcement missing)

---

## 🚀 **Expected Outcomes**

### **After Phase 1** (Week 1)

- Backend coverage: 3.2% → 45%
- All Azure Functions tested
- Core API reliability verified

### **After Phase 2** (Week 2)

- Backend coverage: 45% → 75%
- 5-step algorithm fully tested
- Business rules validated

### **After Phase 3** (Week 3)

- Frontend coverage: 11.96% → 70%
- End-to-end user journeys tested
- Production deployment confidence: 95%

---

## 📋 **Next Steps - Immediate Actions**

1. **Create Azure Function Tests** (Day 1-2)
   - Start with `auth-register-simple.test.ts`
   - Focus on business logic, not mocking complexity
2. **Implement 5-Step Algorithm Tests** (Day 3-4)

   - Create comprehensive scheduling test scenarios
   - Validate fairness distribution logic

3. **Fix Frontend Test Infrastructure** (Day 5)

   - Simplify API client mocking approach
   - Focus on user experience validation

4. **Establish Test Coverage Monitoring** (Day 6-7)
   - Set up automated coverage reporting
   - Integrate with CI/CD pipeline

**Success Criteria**: 85%+ coverage on deployed functionality, all business rules validated, production-ready confidence level achieved.
