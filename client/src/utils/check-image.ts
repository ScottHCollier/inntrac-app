export async function checkImageExists(url: string) {
  const res = await fetch(url);
  const buff = await res.blob();

  return buff.type.startsWith('image/');
}
