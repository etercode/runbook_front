import { browser } from '$app/environment';
import * as api from '$lib/api/client';
import { auth } from '$lib/auth/auth.svelte';
import { getAccessToken } from '$lib/auth/session';

const INTERVAL_MS = 20000;

/** @type {ReturnType<typeof setInterval> | null} */
let timer = null;
/** @type {string} */
let lastPath = '';

/**
 * Start reporting the current page for live admin monitoring.
 * Safe to call multiple times; only runs while authenticated.
 * @param {() => string} getPath
 */
export function startPresence(getPath) {
	if (!browser) return;
	stopPresence();

	const tick = () => {
		if (!auth.isAuthenticated || !getAccessToken()) return;
		const path = getPath() || '/';
		lastPath = path;
		api.sendPresence({ path }).catch(() => {
			/* ignore offline / 401 */
		});
	};

	tick();
	timer = setInterval(tick, INTERVAL_MS);

	document.addEventListener('visibilitychange', onVisibility);
}

function onVisibility() {
	if (document.visibilityState !== 'visible') return;
	if (!auth.isAuthenticated || !getAccessToken() || !lastPath) return;
	api.sendPresence({ path: lastPath }).catch(() => {});
}

export function stopPresence() {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
	if (browser) document.removeEventListener('visibilitychange', onVisibility);
}

/** Push an immediate path update (e.g. on navigation). @param {string} path */
export function reportPresence(path) {
	if (!browser || !auth.isAuthenticated || !getAccessToken()) return;
	lastPath = path || '/';
	api.sendPresence({ path: lastPath }).catch(() => {});
}
