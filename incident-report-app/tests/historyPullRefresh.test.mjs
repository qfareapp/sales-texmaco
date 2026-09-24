import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/services/historyPullRefresh.js', import.meta.url), 'utf8');
const { HISTORY_PULL_REFRESH_SCRIPT } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function gesture({ scrollY = 0, scrollTop = 0, dx = 0, dy = 110, input = false, cancel = false } = {}) {
  const handlers = {};
  const messages = [];
  const target = { scrollTop, closest: () => input, parentElement: null };
  vm.runInNewContext(HISTORY_PULL_REFRESH_SCRIPT, {
    window: { scrollY, ReactNativeWebView: { postMessage: (message) => messages.push(JSON.parse(message)) } },
    document: { addEventListener: (name, handler) => { handlers[name] = handler; } },
  });
  handlers.touchstart({ touches: [{ clientX: 20, clientY: 20 }], target });
  handlers.touchmove({ touches: [{ clientX: 20 + dx, clientY: 20 + dy }], target });
  if (cancel) handlers.touchcancel();
  handlers.touchend();
  handlers.touchend();
  return messages;
}
test('a downward pull from the top requests one history refresh', () => {
  assert.deepEqual(gesture(), [{ type: 'history-pull-refresh' }]);
});
test('ordinary scrolling, horizontal swipes, editing and canceled gestures do not refresh', () => {
  for (const options of [{ scrollY: 50 }, { scrollTop: 20 }, { dx: 80 }, { dy: -120 }, { dy: 50 }, { input: true }, { cancel: true }]) {
    assert.deepEqual(gesture(options), []);
  }
});
