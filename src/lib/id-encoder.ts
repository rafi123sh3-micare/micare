const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function uuidToBase62(uuid: string): string {
  const hex = uuid.replace(/-/g, '');
  let num = BigInt('0x' + hex);
  let result = '';
  while (num > 0) {
    result = BASE62[Number(num % 62n)] + result;
    num /= 62n;
  }
  return result.padStart(1, '0');
}

export function base62ToUuid(base62: string): string {
  let num = 0n;
  for (const char of base62) {
    num = num * 62n + BigInt(BASE62.indexOf(char));
  }
  const hex = num.toString(16).padStart(32, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
