// Keep the web forms untouched. Only adapt browser downloads to native sharing.
export const INSPECTOR_BRIDGE = `
(function () {
  if (window.__texInspectorBridge) return;
  window.__texInspectorBridge = true;
  var objectUrls = new Map();
  var createObjectURL = URL.createObjectURL.bind(URL);
  var revokeObjectURL = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (blob) {
    var url = createObjectURL(blob);
    objectUrls.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = function (url) {
    objectUrls.delete(url);
    return revokeObjectURL(url);
  };
  function send(data) {
    window.ReactNativeWebView.postMessage(JSON.stringify(data));
  }
  function download(anchor) {
    if (!anchor || !anchor.hasAttribute('download')) return false;
    var href = anchor.href;
    if (!/^(blob:|data:|https?:)/.test(href)) return false;
    var name = anchor.download || 'inspection-export';
    if (/^https?:/.test(href)) {
      send({ type: 'download-url', url: href, name: name });
      return true;
    }
    var blob = objectUrls.get(href);
    var read = blob ? Promise.resolve(blob) : fetch(href).then(function (r) { return r.blob(); });
    read.then(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        send({ type: 'download-data', data: reader.result, name: name, mimeType: file.type });
      };
      reader.onerror = function () { send({ type: 'download-error' }); };
      reader.readAsDataURL(file);
    }).catch(function () { send({ type: 'download-error' }); });
    return true;
  }
  // file-saver and jsPDF dispatch clicks on detached anchors, which do not
  // reach document listeners. Handle those as well as ordinary user clicks.
  var anchorClick = HTMLAnchorElement.prototype.click;
  var anchorDispatch = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.click = function () {
    if (!download(this)) return anchorClick.call(this);
  };
  HTMLAnchorElement.prototype.dispatchEvent = function (event) {
    if (event.type === 'click' && download(this)) return false;
    return anchorDispatch.call(this, event);
  };
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest && event.target.closest('a');
    if (!download(anchor)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
true;
`;

export function isInspectorUrl(url, inspectorUrl) {
  try {
    return new URL(url).origin === new URL(inspectorUrl).origin;
  } catch {
    return false;
  }
}

export function safeDownloadName(name = "inspection-export") {
  return String(name).split(/[\\/]/).pop().replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/^\.+/, "_").slice(0, 150) || "inspection-export";
}

// Compact the embedded web header; branding is shown on the native Home screen.
export const INSPECTOR_BRANDING_SCRIPT = `
(function () {
  if (document.getElementById('tex-mobile-branding')) return;
  var style = document.createElement('style');
  style.id = 'tex-mobile-branding';
  style.textContent = '.custom-navbar, img[src="/Texmaco logo.png"], img[src="/Texmaco%20logo.png"] { display: none !important; } .main-content { margin-top: 0 !important; margin-left: 0 !important; padding-top: 12px !important; } .sidebar { top: 0 !important; height: 100vh !important; transform: translateX(-100%) !important; } .sidebar.open { transform: translateX(0) !important; }';
  (document.head || document.documentElement).appendChild(style);
  // The website closes its drawer on phones; do the same on wider app screens.
  document.addEventListener('click', function (event) {
    if (window.innerWidth > 992 && event.target.closest && event.target.closest('.sidebar.open a')) {
      var toggle = document.querySelector('.custom-navbar .hamburger-btn');
      if (toggle) toggle.click();
    }
  }, true);
})(); true;
`;

export const INSPECTOR_SESSION_SCRIPT = `
(function () {
  var previous;
  function reportSession() {
    var signedIn = Boolean(localStorage.getItem('token')) &&
      location.pathname !== '/login' &&
      localStorage.getItem('mustChangePassword') !== 'true';
    var session = { signedIn: signedIn, role: localStorage.getItem('role') || '',
      username: localStorage.getItem('username') || '', path: location.pathname };
    var signature = JSON.stringify(session);
    if (signature === previous) return;
    previous = signature;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'inspector-session', ...session
    }));
  }
  reportSession();
  if (!window.__texInspectorSessionTimer) {
    window.__texInspectorSessionTimer = setInterval(reportSession, 1000);
  }
})();
true;
`;

export function inspectorEntryState(current, signedIn) {
  if (signedIn === true) return 'quality';
  if (signedIn === false && current === 'quality') return 'welcome';
  return current;
}

export function isInspectorHome(session) {
  return session?.signedIn === true && session.role === 'ground-inspector' &&
    session.path?.replace(/\/+$/, '') === '/quality-dashboard';
}

export const INSPECTOR_LOGOUT_SCRIPT = `
(function () {
  ['token', 'role', 'username', 'mustChangePassword'].forEach(function (key) {
    localStorage.removeItem(key);
  });
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'inspector-logout' }));
  window.location.replace('/login');
})();
true;
`;

export function inspectorProfileScript(apiBaseUrl) {
  return `
  (function () {
    var token = localStorage.getItem('token');
    var request = (window.__texProfileRequest || 0) + 1;
    window.__texProfileRequest = request;
    function send(state) {
      if (window.__texProfileRequest !== request || localStorage.getItem('token') !== token) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'inspector-profile', state: state }));
    }
    if (!token || location.pathname === '/login' || localStorage.getItem('mustChangePassword') === 'true') {
      send({ status: 'signed-out' });
      return;
    }
    send({ status: 'loading' });
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    fetch(${JSON.stringify(apiBaseUrl.replace(/\/+$/, "") + "/auth/me")}, {
      headers: { Authorization: 'Bearer ' + token }, signal: controller.signal
    }).then(function (response) {
      if (response.status === 401) throw new Error('Your session has expired. Please log out and sign in again.');
      if (response.status === 404) throw new Error('Your profile is unavailable. Please contact your administrator.');
      return response.json().then(function (body) {
        if (!response.ok || !body.success || !body.data) throw new Error(body.message || 'Unable to load your profile.');
        send({ status: 'ready', data: body.data });
      });
    }).catch(function (error) {
      send({ status: 'error', message: error.name === 'AbortError' ? 'Profile request timed out. Please try again.' : error.message });
    }).finally(function () { clearTimeout(timer); });
  })(); true;`;
}
