import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export async function compressProfilePhoto(asset) {
  const side = Math.min(asset.width, asset.height);
  for (const size of [512, 384, 256, 128]) {
    const result = await manipulateAsync(asset.uri, [
      { crop: { originX: Math.floor((asset.width - side) / 2), originY: Math.floor((asset.height - side) / 2), width: side, height: side } },
      { resize: { width: Math.min(side, size), height: Math.min(side, size) } },
    ], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
    try {
      const info = await FileSystem.getInfoAsync(result.uri);
      if (info.exists && info.size < 100000 && result.base64) return "data:image/jpeg;base64," + result.base64;
    } finally {
      await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
    }
  }
  throw new Error("Unable to compress this photo below 100 KB. Please choose another image.");
}

export function profilePhotoScript(apiBaseUrl, request) {
  return `(async function () {
    var request = ${JSON.stringify(request)};
    var token = localStorage.getItem('token');
    function send(result) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'inspector-photo', id: request.id, ...result }));
    }
    if (!token || localStorage.getItem('username') !== request.username) {
      send({ error: 'Your session changed. Please log in again.' }); return;
    }
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(${JSON.stringify(apiBaseUrl.replace(/\/+$/, "") + "/auth/me/photo")}, {
        method: request.method, signal: controller.signal,
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        ...(request.method === 'PUT' ? { body: JSON.stringify({ photo: request.photo }) } : {})
      });
      if (response.status === 404) throw new Error('Profile photos are not available on the server yet. Please contact your administrator.');
      var body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.message || 'Unable to save or load your photo.');
      if (localStorage.getItem('token') !== token) throw new Error('Your session changed. Please try again.');
      send({ photo: body.photo });
    } catch (error) { send({ error: error.name === 'AbortError' ? 'Photo request timed out. Please try again.' : error.message }); }
    finally { clearTimeout(timer); }
  })(); true;`;
}
