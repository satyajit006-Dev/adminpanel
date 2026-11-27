export function isSafeAvatarSrc(src?: string): boolean {
  if (typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed || trimmed.length > 500_000) return false;
  if (trimmed.startsWith('/src/') || trimmed.startsWith('/assets/')) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function compressAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid JPG, PNG, or WebP photo.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Selected photo is too large (max 10 MB).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected photo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.onload = () => {
        const targetSize = 320;
        const side = Math.min(img.width, img.height);
        const sx = Math.max(0, Math.floor((img.width - side) / 2));
        const sy = Math.max(0, Math.floor((img.height - side) / 2));

        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to process photo in this browser.'));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
