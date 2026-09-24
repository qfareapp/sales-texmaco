const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const { validProfilePhoto } = require('../utils/profilePhoto');
const jpeg = (size) => {
  const bytes = Buffer.alloc(size);
  bytes.set([255, 216, 255]);
  bytes.set([255, 217], size - 2);
  return 'data:image/jpeg;base64,' + bytes.toString('base64');
};
test('photos must be JPEG data smaller than 100000 bytes', () => {
  assert.equal(validProfilePhoto(jpeg(99999)), true);
  assert.equal(validProfilePhoto(jpeg(100000)), false);
  for (const invalid of [null, '', 'data:image/png;base64,AAAA', 'data:image/jpeg;base64,AAAA', jpeg(10) + '!']) {
    assert.equal(validProfilePhoto(invalid), false);
  }
});

function fixture(account = { isActive: true }) {
  const routes = {};
  let written;
  const router = { post() {}, get(path, ...handlers) { routes['GET ' + path] = handlers; }, put(path, ...handlers) { routes['PUT ' + path] = handlers; } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../routes/auth.routes'), 'utf8'), {
    require(name) {
      if (name === 'express') return { Router: () => router };
      if (name === 'jsonwebtoken') return jwt;
      if (name.includes('passwords')) return {};
      if (name.includes('InspectorAccount')) return { findOne: () => ({ select: () => ({ lean: async () => account }) }) };
      if (name.includes('profilePhoto')) return { validProfilePhoto };
      if (name.includes('InspectorPhoto')) return {
        findOne: (query) => ({ lean: async () => ({ photo: query.username === 'alice' ? jpeg(10) : null }) }),
        findOneAndUpdate: async (query, update) => { written = { query, update }; },
      };
      throw new Error(name);
    }, process: { env: {} }, module: { exports: {} }, console,
  });
  return {
    async request({ method = 'PUT', token = jwt.sign({ username: 'alice', role: 'ground-inspector' }, 'texmaco_secret_key'), photo = jpeg(10) } = {}) {
      let status = 200, body;
      const req = { headers: { authorization: token ? 'Bearer ' + token : '' }, body: { photo, username: 'someone-else' } };
      const res = { status(code) { status = code; return this; }, json(value) { body = value; return this; } };
      for (const handler of routes[method + ' /me/photo']) {
        let next = false;
        await handler(req, res, () => { next = true; });
        if (!next) break;
      }
      return { status, body, written };
    },
  };
}
test('photo upload and retrieval use the authenticated account, ignoring supplied username', async () => {
  const result = await fixture().request();
  assert.equal(result.status, 200);
  assert.equal(result.written.query.username, 'alice');
  assert.equal(result.written.update.$set.photo, jpeg(10));
  assert.equal((await fixture().request({ method: 'GET' })).body.photo, jpeg(10));
});
test('unauthenticated, inactive and non-inspector accounts cannot upload', async () => {
  assert.equal((await fixture().request({ token: '' })).status, 401);
  assert.equal((await fixture({ isActive: false }).request()).status, 403);
  assert.equal((await fixture(null).request()).status, 403);
  assert.equal((await fixture().request({ token: jwt.sign({ username: 'alice', role: 'admin' }, 'texmaco_secret_key') })).status, 403);
});
test('oversized uploads never write to storage', async () => {
  const result = await fixture().request({ photo: jpeg(100000) });
  assert.equal(result.status, 400);
  assert.equal(result.written, undefined);
});
