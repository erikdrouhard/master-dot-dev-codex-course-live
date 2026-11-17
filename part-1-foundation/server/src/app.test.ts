import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const app = buildApp();
afterAll(() => app.close());

describe('GET /api/health', () => {
  it('reports a healthy database', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, db: 'ok' });
  });
});

describe('GET /api/catalog/search', () => {
  it('returns sample slugs in catalog order for a case-insensitive query', async () => {
    const response = await app.inject('/api/catalog/search?q=%20gPu%20');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(['nvidia-h100-sxm-80gb', 'supermicro-4u-gpu-chassis']);
  });

  it('distinguishes all lots, no matches, and malformed queries', async () => {
    const all = await app.inject('/api/catalog/search');
    const empty = await app.inject('/api/catalog/search?q=zzzz');
    const invalid = await app.inject(`/api/catalog/search?q=${'x'.repeat(201)}`);
    expect(all.json()).toHaveLength(6);
    expect(empty.json()).toEqual([]);
    expect(invalid.statusCode).toBe(400);
  });
});
