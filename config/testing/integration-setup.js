import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Mock database connection
let mockDb = null;

beforeAll(async () => {
  // Initialize test database
  console.log('Setting up test database...');
  mockDb = {
    connected: true,
    query: async (sql, params) => ({ rows: [], rowCount: 0 }),
    transaction: async (callback) => callback(mockDb)
  };
});

afterAll(async () => {
  // Cleanup test database
  console.log('Tearing down test database...');
  if (mockDb) {
    mockDb.connected = false;
    mockDb = null;
  }
});

beforeEach(async () => {
  // Reset database state before each test
  console.log('Resetting test database state...');
});

afterEach(async () => {
  // Cleanup after each test
  console.log('Cleaning up after test...');
});

// Export test utilities
export const getTestDb = () => mockDb;
export const createMockData = (count = 10) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `test-${i}`,
    title: `Test Item ${i}`,
    description: `Test description ${i}`,
    createdAt: new Date().toISOString()
  }));
};
