export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';

export interface AlgorithmInfo {
  bitCount: number;
  hexLength: number;
}

export const ALGORITHM_INFO: Record<HashAlgorithm, AlgorithmInfo> = {
  'MD5':     { bitCount: 128, hexLength: 32 },
  'SHA-1':   { bitCount: 160, hexLength: 40 },
  'SHA-256': { bitCount: 256, hexLength: 64 },
  'SHA-512': { bitCount: 512, hexLength: 128 },
};

export interface HashResult {
  hash: string;
  algorithm: string;
  bitCount: number;
  hexLength: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __TAURI__: any;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function textToBase64(text: string): string {
  const encoder = new TextEncoder();
  return arrayBufferToBase64(encoder.encode(text).buffer);
}

export function isHMACSupported(algorithm: HashAlgorithm): boolean {
  return algorithm !== 'MD5';
}

export async function openFilePicker(pluginId: string, title?: string): Promise<string | null> {
  const result = await __TAURI__.core.invoke('handle_plugin_ipc', {
    pluginId,
    method: 'dialog.openFile',
    args: [title || '选择文件'],
  });
  return result as string | null;
}

export async function computeHash(
  pluginId: string,
  data: ArrayBuffer,
  algorithm: HashAlgorithm
): Promise<HashResult> {
  const dataB64 = arrayBufferToBase64(data);
  const result = await __TAURI__.core.invoke('handle_plugin_ipc', {
    pluginId,
    method: 'hash.compute',
    args: [dataB64, algorithm],
  });
  return result as HashResult;
}

export async function computeHMAC(
  pluginId: string,
  data: ArrayBuffer,
  key: string,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'
): Promise<HashResult> {
  const dataB64 = arrayBufferToBase64(data);
  const result = await __TAURI__.core.invoke('handle_plugin_ipc', {
    pluginId,
    method: 'hash.hmac',
    args: [dataB64, key, algorithm],
  });
  return result as HashResult;
}

export async function hashFile(
  pluginId: string,
  filePath: string,
  algorithm: HashAlgorithm
): Promise<HashResult & { fileSize: number }> {
  const result = await __TAURI__.core.invoke('handle_plugin_ipc', {
    pluginId,
    method: 'hash.file',
    args: [filePath, algorithm],
  });
  return result as HashResult & { fileSize: number };
}
