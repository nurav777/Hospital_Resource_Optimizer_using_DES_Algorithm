const request = require('supertest');
const app = require('../server');

describe('User API Integration Tests', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ username: 'testuser', password: 'testpass' });
    expect(response.status).toBe(201);
  });

  it('should list users', async () => {
    const response = await request(app)
      .get('/api/users');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
