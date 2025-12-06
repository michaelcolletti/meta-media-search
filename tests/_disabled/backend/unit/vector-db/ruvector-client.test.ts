import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RuVectorClient } from '../../../../src/vector-db/ruvector-client.js';

describe('RuVectorClient', () => {
  let client: RuVectorClient;
  const testCollection = 'test_collection';

  beforeEach(async () => {
    client = new RuVectorClient({ dimensions: 128 });
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  it('should initialize', async () => {
    expect(client).toBeDefined();
  });

  it('should insert and search vectors', async () => {
    const vector = new Array(128).fill(0).map(() => Math.random());
    await client.insert({ id: 'test-1', vector });
    
    const results = await client.search({ vector, k: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('test-1');
  });
});
