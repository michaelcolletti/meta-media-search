# Testing Strategy - Meta Media Search

## Overview

Comprehensive testing strategy for Rust/WASM components, vector database operations, and personalization engine with target coverage of 85%+ across all modules.

## Test Suite Structure

### 1. Rust Unit Tests (`rust-wasm/tests/`)

**Coverage Target: 90%+**

- **Vector Operations**
  - Cosine similarity calculations
  - Vector normalization
  - Dot product operations
  - Magnitude calculations

- **Edge Cases**
  - Zero vectors
  - Very small/large values
  - Single dimension vectors
  - High-dimensional vectors (1536D)
  - Mixed sign values

- **Property-Based Tests**
  - Cosine similarity range validation
  - Normalization produces unit vectors
  - Commutative property verification

**Run Tests:**
```bash
cd rust-wasm
cargo test --lib
cargo test --release
```

### 2. WASM Integration Tests (`tests/wasm/`)

**Coverage Target: 85%+**

- **Module Loading**
  - Successful WASM initialization
  - Function export verification
  - Error handling during load

- **Browser Operations**
  - Vector operations in browser context
  - Memory management
  - JavaScript interop
  - Data type conversions

- **Cross-Browser Compatibility**
  - Chrome/Chromium
  - Firefox
  - Safari/WebKit

**Run Tests:**
```bash
npm run test:wasm
# or
vitest run tests/wasm/browser-integration.test.ts
```

### 3. Performance Benchmarks (`tests/performance/`)

**Metrics:**
- WASM vs JavaScript speed comparison
- Operation throughput
- Memory efficiency
- Response time under load

**Test Scenarios:**
- Small vectors (dim=3)
- Medium vectors (dim=128)
- Large vectors (dim=1536)
- Batch operations (100-10000 vectors)

**Expected Results:**
- 2-4x speedup for large vectors
- <1ms for single similarity calculation
- <100ms for 1000 vector batch
- <50MB memory growth

**Run Tests:**
```bash
npm run test:performance
```

### 4. E2E Personalization Tests (`tests/integration/`)

**Coverage Target: 80%+**

- **User Behavior Tracking**
  - View events
  - Search queries
  - Watchlist operations
  - Rating submissions

- **Vector Generation**
  - User preference vector creation
  - Vector updates on interaction
  - Vector storage/retrieval

- **Recommendation Engine**
  - Personalized recommendations
  - Relevance ranking
  - Content filtering
  - Real-time updates

**Run Tests:**
```bash
npm run test:e2e
# or
playwright test tests/integration/personalization.test.ts
```

### 5. Mobile Compatibility Tests (`tests/mobile/`)

**Test Coverage:**
- iOS Safari
- Android Chrome
- Responsive breakpoints
- Touch interactions
- Network conditions (3G, 4G, offline)
- Memory constraints

**Viewports Tested:**
- Small mobile: 320x568
- Medium mobile: 375x667
- Large mobile: 414x896
- Tablet: 768x1024

**Run Tests:**
```bash
npm run test:mobile
```

### 6. Load Tests (`tests/performance/load-tests.ts`)

**Test Scenarios:**
- 50 concurrent users
- Burst traffic (100 simultaneous requests)
- Sustained load (30 seconds)
- Large datasets (10,000 vectors)

**Performance Thresholds:**
- Error rate: <1%
- Average response: <500ms
- P95 response: <1s
- P99 response: <2s

## Running All Tests

### Quick Test Suite
```bash
npm test
```

### Comprehensive Test Suite
```bash
npm run test:ci
```

### Individual Test Categories
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# Mobile tests
npm run test:mobile
```

## Coverage Reports

### Generate Coverage
```bash
npm run test:coverage
```

### View Coverage
```bash
open coverage/index.html
```

### Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| Rust Vector Ops | 90% | - |
| WASM Integration | 85% | - |
| Personalization | 80% | - |
| Mobile Support | 80% | - |
| Load Tests | N/A | - |

## Continuous Integration

### Pre-commit Hooks
```bash
npm run lint
npm run typecheck
npm run test:unit
```

### CI Pipeline
```bash
npm run test:ci
```

**Steps:**
1. Lint check
2. Type checking
3. Unit tests with coverage
4. Integration tests
5. E2E tests
6. Performance benchmarks
7. Coverage report upload

## Test Data Management

### Fixtures Location
- `tests/fixtures/` - Mock data
- `tests/mocks/` - Service mocks

### Test Database
- Use in-memory SQLite for unit tests
- Use test database for integration tests
- Clean up after each test

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Fast Feedback**: Unit tests <100ms, integration <1s
3. **Clear Assertions**: One logical assertion per test
4. **Descriptive Names**: Test names explain what and why
5. **Mock External Services**: Avoid real API calls
6. **Clean Up**: Always restore state after tests

## Debugging Tests

### Verbose Output
```bash
npm test -- --reporter=verbose
```

### Debug Specific Test
```bash
npm test -- --grep "cosine similarity"
```

### Playwright Debug Mode
```bash
npm run test:e2e:ui
```

### WASM Debug
```bash
RUST_LOG=debug cargo test
```

## Performance Monitoring

### Benchmark Tracking
```bash
npm run benchmark
```

### Memory Profiling
```bash
node --expose-gc tests/performance/wasm-benchmarks.ts
```

## Test Reporting

Reports are generated in:
- `coverage/` - Coverage reports (HTML, LCOV, JSON)
- `test-results/` - Playwright test results
- `benchmarks/` - Performance benchmark results

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure 80%+ coverage for new code
3. Run full test suite before committing
4. Update this documentation

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [WASM Testing Guide](https://rustwasm.github.io/wasm-pack/book/commands/test.html)
