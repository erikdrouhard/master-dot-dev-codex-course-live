import Fastify from 'fastify';
import pg from 'pg';
import { catalog } from '../../web/src/catalog.js';

const connectionString = process.env.DATABASE_URL ?? 'postgres://auction:auction@localhost:55432/auction_part_1';

export function buildApp() {
  const app = Fastify({ logger: true, requestIdHeader: 'x-request-id' });
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 1000 });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.get<{ Querystring: { q?: string } }>('/api/catalog/search', {
    schema: {
      querystring: {
        type: 'object',
        properties: { q: { type: 'string', maxLength: 200 } },
      },
    },
  }, async (request) => {
    const query = (request.query.q ?? '').trim().toLowerCase();
    return catalog
      .filter((item) => `${item.title} ${item.category} ${item.kicker}`.toLowerCase().includes(query))
      .map((item) => item.slug);
  });

  app.get('/api/health', async (request, reply) => {
    try {
      await pool.query('SELECT 1');
      return { ok: true, db: 'ok', requestId: request.id };
    } catch (error) {
      request.log.error({ err: error }, 'database health check failed');
      return reply.code(503).send({ ok: false, db: 'down', requestId: request.id });
    }
  });

  app.addHook('onClose', async () => pool.end());
  return app;
}
