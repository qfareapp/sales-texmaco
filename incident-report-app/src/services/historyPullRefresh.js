// Android WebView has no native pullToRefreshEnabled control. Only install
// this on the read-only history page, never on inspection forms.
export const HISTORY_PULL_REFRESH_SCRIPT = `
(function () {
  if (window.__texHistoryPullRefresh) return;
  window.__texHistoryPullRefresh = true;
  var start = null;
  var distance = 0;
  function atTop(target) {
    if ((window.scrollY || 0) > 0) return false;
    for (var node = target; node; node = node.parentElement) {
      if (node.scrollTop > 0) return false;
    }
    return true;
  }
  document.addEventListener('touchstart', function (event) {
    distance = 0;
    start = event.touches.length === 1 && atTop(event.target) &&
      !(event.target.closest && event.target.closest('input, textarea, select, button, [role="dialog"]'))
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  document.addEventListener('touchmove', function (event) {
    if (!start) return;
    if (event.touches.length !== 1 || !atTop(event.target)) { start = null; return; }
    var touch = event.touches[0];
    distance = touch.clientY - start.y;
    if (distance < 0 || Math.abs(touch.clientX - start.x) > 30) start = null;
  }, { passive: true });
  document.addEventListener('touchend', function () {
    if (start && distance >= 90) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'history-pull-refresh' }));
    start = null;
    distance = 0;
  }, { passive: true });
  document.addEventListener('touchcancel', function () { start = null; distance = 0; }, { passive: true });
})(); true;`;
