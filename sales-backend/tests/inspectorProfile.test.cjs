const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');

const source = fs.readFileSync(path.join(__dirname, '../routes/auth.routes.js'), 'utf8');
function fixture(account) {
  let handlers;
  let lookup;
  const router = { post() {}, put() {}, get(route, ...middleware) { if (route === '/me') handlers = middleware; } };
  vm.runInNewContext(source, {
    require: (name) => {
      if (name === 'express') return { Router: () => router };
      if (name === 'jsonwebtoken') return jwt;
      if (name.includes('passwords')) return {};
      if (name.includes('InspectorAccount')) return { findOne(query) {
        lookup = JSON.parse(JSON.stringify(query));
        return { select(fields) {
          assert.equal(fields.includes('passwordHash'), false);
          assert.equal(fields.includes('passwordSalt'), false);
          return { lean: async () => account };
        } };
      } };
      throw new Error(name);
    },
    process: { env: {} }, module: { exports: {} }, console,
  });
  return {
    async request(token) {
      let status = 200;
      let body;
      const req = { headers: { authorization: token ? `Bearer ${token}` : '' }, query: { username: 'another.inspector' } };
      const res = { status(value) { status = value; return this; }, json(value) { body = JSON.parse(JSON.stringify(value)); return this; } };
      let allowed = false;
      handlers[0](req, res, () => { allowed = true; });
      if (allowed) await handlers[1](req, res);
      return { status, body, lookup };
    },
  };
}
const token = (username = 'test.inspector', options = { expiresIn: '1h' }) => jwt.sign({ username, role: 'ground-inspector' }, 'texmaco_secret_key', options);

test('profile requires a valid, unexpired bearer token', async () => {
  for (const credential of ['', 'invalid', token('test.inspector', { expiresIn: -1 })]) {
    const result = await fixture(null).request(credential);
    assert.equal(result.status, 401);
    assert.equal(result.lookup, undefined);
  }
});

test('profile selects the signed-in inspector and returns only safe account fields', async () => {
  const result = await fixture({
    _id: '123', slNo: 7, name: 'Test Inspector', username: 'test.inspector', jobRole: 'Quality',
    agency: 'Agency', bay: '4', isActive: true, mustChangePassword: false,
    createdAt: '2026-01-01', updatedAt: '2026-02-01', passwordHash: 'never-return', passwordSalt: 'never-return',
  }).request(token());
  assert.equal(result.status, 200);
  assert.deepEqual(result.lookup, { username: 'test.inspector' });
  assert.equal(result.body.data.name, 'Test Inspector');
  assert.equal(result.body.data.bay, '4');
  assert.equal(result.body.data.createdAt, '2026-01-01');
  assert.equal(JSON.stringify(result.body).includes('never-return'), false);
  assert.equal(Object.keys(result.body.data).length, 12);
});

test('inactive and removed inspectors cannot read a profile with an old token', async () => {
  assert.equal((await fixture({ isActive: false }).request(token())).status, 403);
  assert.equal((await fixture(null).request(token())).status, 404);
});

test('built-in inspector has basic account data without invented employee details', async () => {
  const result = await fixture(null).request(token('inspector'));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data, { username: 'inspector', role: 'ground-inspector', isActive: true, mustChangePassword: false });
});
