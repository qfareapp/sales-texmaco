function validProfilePhoto(photo) {
  if (typeof photo !== "string" || photo.length > 133359 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) return false;
  const encoded = photo.slice(23);
  const bytes = Buffer.from(encoded, "base64");
  return bytes.length > 4 && bytes.length < 100000 && bytes.toString("base64") === encoded &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
    bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
}
module.exports = { validProfilePhoto };
