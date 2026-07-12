/**
 * Downscale oversized images before upload. GIFs are left alone.
 * @param {File} file
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<File>}
 */
export async function resizeImageFile(file, opts = {}) {
	const maxEdge = opts.maxEdge ?? 1400;
	const quality = opts.quality ?? 0.86;

	if (!file.type.startsWith('image/') || file.type === 'image/gif') {
		return file;
	}

	let bitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return file;
	}

	const { width, height } = bitmap;
	if (width <= maxEdge && height <= maxEdge) {
		bitmap.close();
		return file;
	}

	const scale = Math.min(maxEdge / width, maxEdge / height);
	const w = Math.max(1, Math.round(width * scale));
	const h = Math.max(1, Math.round(height * scale));

	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		bitmap.close();
		return file;
	}
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();

	const preferJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.size > 400_000;
	const mime = preferJpeg ? 'image/jpeg' : file.type === 'image/webp' ? 'image/webp' : 'image/png';

	const blob = await new Promise((resolve) => {
		canvas.toBlob((b) => resolve(b), mime, quality);
	});

	if (!blob) return file;

	const base = (file.name || 'image').replace(/\.[^.]+$/, '');
	const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
	return new File([blob], `${base}.${ext}`, { type: mime, lastModified: Date.now() });
}
