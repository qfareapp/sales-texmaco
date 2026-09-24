import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/services/profilePhoto.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');

test('compression retries oversized photos and returns only a verified file below 100 KB', async () => {
  let attempts = 0;
  const removed = [];
  const context = vm.createContext({
    SaveFormat: { JPEG: 'jpeg' },
    manipulateAsync: async (_uri, actions, options) => {
      attempts++;
      assert.equal(actions[0].crop.width, 600);
      assert.equal(actions[0].crop.originX, 100);
      assert.equal(options.format, 'jpeg');
      return { uri: 'temp' + attempts, base64: 'encoded' };
    },
    FileSystem: {
      getInfoAsync: async () => ({ exists: true, size: attempts === 1 ? 100000 : 99999 }),
      deleteAsync: async (uri) => removed.push(uri),
    },
  });
  vm.runInContext(source, context);
  assert.equal(await context.compressProfilePhoto({ uri: 'original', width: 800, height: 600 }), 'data:image/jpeg;base64,encoded');
  assert.equal(attempts, 2);
  assert.deepEqual(removed, ['temp1', 'temp2']);
});

test('compression rejects images that cannot meet the size limit', async () => {
  const context = vm.createContext({
    SaveFormat: { JPEG: 'jpeg' },
    manipulateAsync: async () => ({ uri: 'temp', base64: 'encoded' }),
    FileSystem: { getInfoAsync: async () => ({ exists: true, size: 100000 }), deleteAsync: async () => {} },
  });
  vm.runInContext(source, context);
  await assert.rejects(context.compressProfilePhoto({ uri: 'original', width: 800, height: 600 }), /below 100 KB/);
});
