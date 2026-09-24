import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const code = await readFile(new URL('../src/services/inspectorBridge.js', import.meta.url), 'utf8');
const { INSPECTOR_BRIDGE, INSPECTOR_SESSION_SCRIPT, INSPECTOR_LOGOUT_SCRIPT, inspectorProfileScript, inspectorEntryState, isInspectorHome, isInspectorUrl, safeDownloadName } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const portal = 'https://texmaco-frontend.vercel.app/quality-dashboard';

test('profile fetch authenticates inside the web portal without passing tokens to native', async () => {
  const messages = [];
  const context = vm.createContext({
    localStorage: { getItem: (key) => key === 'token' ? 'private-token' : null },
    location: { pathname: '/quality-dashboard' },
    window: { ReactNativeWebView: { postMessage: (data) => messages.push(JSON.parse(data)) } },
    fetch: async (url, options) => {
      assert.equal(url, 'https://api.test/api/auth/me');
      assert.equal(options.headers.Authorization, 'Bearer private-token');
      return { ok: true, status: 200, json: async () => ({ success: true, data: { name: 'Test Inspector' } }) };
    },
    AbortController, setTimeout, clearTimeout,
  });
  vm.runInContext(inspectorProfileScript('https://api.test/api/'), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(messages[0].state.status, 'loading');
  assert.deepEqual(messages[1].state, { status: 'ready', data: { name: 'Test Inspector' } });
  assert.equal(JSON.stringify(messages).includes('private-token'), false);
});

test('an in-flight profile response is discarded after logout or account switching', async () => {
  const messages = [];
  let currentToken = 'first-account';
  let complete;
  const context = vm.createContext({
    localStorage: { getItem: (key) => key === 'token' ? currentToken : null },
    location: { pathname: '/quality-dashboard' },
    window: { ReactNativeWebView: { postMessage: (data) => messages.push(JSON.parse(data)) } },
    fetch: () => new Promise((resolve) => { complete = resolve; }),
    AbortController, setTimeout, clearTimeout,
  });
  vm.runInContext(inspectorProfileScript('https://api.test/api'), context);
  currentToken = null;
  complete({ ok: true, status: 200, json: async () => ({ success: true, data: { name: 'Previous Inspector' } }) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].state.status, 'loading');
});

test('profile logout clears web authentication before acknowledging and returns to login', () => {
  const storage = new Map([
    ['token', 'secret'], ['role', 'ground-inspector'], ['username', 'inspector'],
    ['mustChangePassword', 'false'], ['saved-draft', 'keep'],
  ]);
  let target;
  let acknowledged = false;
  const context = vm.createContext({
    localStorage: { removeItem: (key) => storage.delete(key) },
    window: {
      ReactNativeWebView: { postMessage: (data) => {
        assert.deepEqual([...storage.keys()], ['saved-draft']);
        assert.deepEqual(JSON.parse(data), { type: 'inspector-logout' });
        acknowledged = true;
      } },
      location: { replace: (url) => { target = url; } },
    },
  });
  vm.runInContext(INSPECTOR_LOGOUT_SCRIPT, context);
  assert.equal(acknowledged, true);
  assert.equal(target, '/login');
  assert.equal(storage.get('saved-draft'), 'keep');
});

test('first use, login, remembered session and logout choose the correct entry screen', () => {
  assert.equal(inspectorEntryState('welcome', false), 'welcome');
  assert.equal(inspectorEntryState('login', false), 'login');
  assert.equal(inspectorEntryState('login', true), 'quality');
  assert.equal(inspectorEntryState('welcome', true), 'quality');
  assert.equal(inspectorEntryState('quality', false), 'welcome');
  assert.equal(inspectorEntryState('quality', undefined), 'quality');
});

test('session detection waits for password change and never sends tokens to native', () => {
  const storage = new Map();
  const messages = [];
  let poll;
  const context = vm.createContext({
    window: { ReactNativeWebView: { postMessage: (data) => messages.push(JSON.parse(data)) } },
    localStorage: { getItem: (key) => storage.get(key) ?? null },
    location: { pathname: '/login' },
    setInterval: (callback) => { poll = callback; return 1; },
  });
  vm.runInContext(INSPECTOR_SESSION_SCRIPT, context);
  assert.deepEqual(messages, [{ type: 'inspector-session', signedIn: false, role: '', username: '', path: '/login' }]);
  storage.set('token', 'secret-token');
  storage.set('role', 'ground-inspector');
  storage.set('username', 'test.inspector');
  storage.set('mustChangePassword', 'true');
  context.location.pathname = '/change-password';
  poll();
  assert.equal(messages.at(-1).signedIn, false);
  storage.set('mustChangePassword', 'false');
  context.location.pathname = '/quality-dashboard';
  poll();
  assert.deepEqual(messages.at(-1), { type: 'inspector-session', signedIn: true, role: 'ground-inspector', username: 'test.inspector', path: '/quality-dashboard' });
  poll();
  assert.equal(messages.length, 3);
  context.location.pathname = '/quality/wagon-data-sheet/first-zone';
  poll();
  assert.equal(messages.at(-1).path, '/quality/wagon-data-sheet/first-zone');
  assert.equal(messages.at(-1).signedIn, true);
  // The portal can route to login even if stale storage remains.
  context.location.pathname = '/login';
  poll();
  assert.equal(messages.at(-1).signedIn, false);
  assert.equal(messages.at(-1).path, '/login');
  assert.equal(JSON.stringify(messages).includes('secret-token'), false);
});

test('mobile home appears only on the signed-in inspector dashboard, never over a form or another role', () => {
  const inspector = { signedIn: true, role: 'ground-inspector', path: '/quality-dashboard' };
  assert.equal(isInspectorHome(inspector), true);
  assert.equal(isInspectorHome({ ...inspector, path: '/quality-dashboard/' }), true);
  assert.equal(isInspectorHome({ ...inspector, path: '/quality/wagon-data-sheet/first-zone' }), false);
  assert.equal(isInspectorHome({ ...inspector, role: 'quality-admin' }), false);
  assert.equal(isInspectorHome({ ...inspector, signedIn: false }), false);
  assert.equal(isInspectorHome(null), false);
});

test('only the inspector origin can send native bridge messages', () => {
  assert.equal(isInspectorUrl('https://texmaco-frontend.vercel.app/login', portal), true);
  for (const url of ['https://texmaco-frontend.vercel.app.evil.test/', 'https://texmaco-frontend.vercel.app@evil.test/', 'javascript:alert(1)', 'invalid']) {
    assert.equal(isInspectorUrl(url, portal), false);
  }
});

test('download filenames cannot escape their temporary directory', () => {
  assert.equal(safeDownloadName('../../inspection.xlsx'), 'inspection.xlsx');
  assert.equal(safeDownloadName('..\\..\\inspection.pdf'), 'inspection.pdf');
  assert.equal(safeDownloadName('..'), '_');
  assert.equal(safeDownloadName(''), 'inspection-export');
});

test('live, build and development settings pair the backend and web portal', () => {
  const keys = ['APP_ENV', 'EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_INSPECTOR_WEB_URL'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    keys.forEach((key) => delete process.env[key]);
    const config = require('../app.config.js');
    const live = config().expo.extra;
    assert.equal(live.apiBaseUrl, 'https://texmaco-backend.onrender.com/api');
    assert.equal(live.inspectorWebUrl, portal);
    const eas = require('../eas.json');
    for (const profile of ['preview', 'production']) {
      assert.equal(eas.build[profile].env.EXPO_PUBLIC_API_BASE_URL, live.apiBaseUrl);
      assert.equal(eas.build[profile].env.EXPO_PUBLIC_INSPECTOR_WEB_URL, portal);
    }
    process.env.APP_ENV = 'development';
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.20:5000/api';
    assert.equal(config().expo.extra.inspectorWebUrl, 'http://192.168.1.20:5173/quality-dashboard');
    process.env.EXPO_PUBLIC_INSPECTOR_WEB_URL = 'http://192.168.1.20:5174/quality-dashboard';
    assert.equal(config().expo.extra.inspectorWebUrl, process.env.EXPO_PUBLIC_INSPECTOR_WEB_URL);
  } finally {
    keys.forEach((key) => previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]);
  }
});

function browser() {
  const messages = [];
  const handlers = {};
  class Anchor {
    hasAttribute(name) { return name === 'download' && this.download !== undefined; }
    click() { this.clicked = true; }
    dispatchEvent() { this.dispatched = true; return true; }
  }
  class Reader {
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
        this.onload();
      });
    }
  }
  let sequence = 0;
  const context = vm.createContext({
    window: { ReactNativeWebView: { postMessage: (message) => messages.push(JSON.parse(message)) } },
    URL: { createObjectURL: () => `blob:test-${++sequence}`, revokeObjectURL() {} },
    HTMLAnchorElement: Anchor, FileReader: Reader, fetch,
    document: { addEventListener: (event, handler) => { handlers[event] = handler; } },
  });
  vm.runInContext(INSPECTOR_BRIDGE, context);
  return { context, messages, handlers, Anchor };
}

test('detached export anchors preserve bytes and filename after blob URL revocation', async () => {
  const { context, messages, Anchor } = browser();
  vm.runInContext(INSPECTOR_BRIDGE, context);
  const anchor = new Anchor();
  anchor.href = context.URL.createObjectURL(new Blob(['inspection data'], { type: 'application/pdf' }));
  anchor.download = 'Inspection.pdf';
  assert.equal(anchor.dispatchEvent({ type: 'click' }), false);
  context.URL.revokeObjectURL(anchor.href);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].name, 'Inspection.pdf');
  assert.equal(messages[0].mimeType, 'application/pdf');
  assert.equal(Buffer.from(messages[0].data.split(',')[1], 'base64').toString(), 'inspection data');
});

test('ordinary navigation is untouched; download clicks use native saving', () => {
  const { messages, handlers, Anchor } = browser();
  const normal = new Anchor();
  normal.href = portal;
  normal.click();
  assert.equal(normal.clicked, true);
  assert.equal(messages.length, 0);
  const download = new Anchor();
  download.href = 'https://example.test/inspection.xlsx';
  download.download = 'Inspection.xlsx';
  download.click();
  assert.equal(download.clicked, undefined);
  assert.equal(messages[0].type, 'download-url');
  let prevented = false;
  handlers.click({ target: { closest: () => download }, preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
  assert.equal(prevented, true);
  assert.equal(messages.length, 2);
});
