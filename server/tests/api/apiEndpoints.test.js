const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');

describe('LunchLoop API Integration Tests (Zero-Login Architecture)', () => {
  it('GET /api/health returns 200 and healthy status envelope', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'healthy');
    assert.equal(res.body.data.service, 'LunchLoop API Server');
    assert(res.body.meta.timestamp);
  });

  it('GET /api/public/canteen returns canteen details and order rules', async () => {
    const res = await request(app).get('/api/public/canteen');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert(res.body.data.canteen);
    assert(res.body.data.canteen.name);
    assert(res.body.data.rules);
    assert.equal(typeof res.body.data.rules.cancellation_cutoff_minutes, 'number');
  });

  it('GET /api/orders without token seamlessly returns student orders (zero-login)', async () => {
    const res = await request(app).get('/api/orders');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert(Array.isArray(res.body.data.orders));
  });

  it('POST /api/orders with invalid payload returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        pickup_window_id: '',
        items: []
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert(res.body.error.details.length > 0);
  });

  it('GET /api/staff/queue seamlessly returns kitchen queue (zero-login)', async () => {
    const res = await request(app).get('/api/staff/queue');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert(Array.isArray(res.body.data.queue));
  });

  it('GET /api/staff/analytics/overview returns operational metrics (zero-login)', async () => {
    const res = await request(app).get('/api/staff/analytics/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert(res.body.data.overview);
  });

  it('GET /api/admin/users with student token returns 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', 'Bearer mock-student-00000000-0000-0000-0000-000000000001');

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('GET /api/non-existent-endpoint returns 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
