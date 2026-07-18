import { browser } from '$app/environment';
import { API_URL } from '$lib/config';
import {
	clearSession,
	getAccessToken,
	getRefreshToken,
	saveSession
} from '$lib/auth/session';

export class ApiError extends Error {
	/** @param {number} status @param {any} body @param {string} [message] */
	constructor(status, body, message) {
		super(message ?? `Request failed with status ${status}`);
		this.status = status;
		this.body = body;
	}
}

const TIMEOUT_MS = 15000;

/** @param {Response} response */
async function parseJson(response) {
	const text = await response.text();
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @param {boolean} [auth] attach the bearer token and retry once on 401
 */
async function request(path, options = {}, auth = false) {
	const headers = new Headers(options.headers);
	const body = options.body;
	if (!headers.has('Content-Type') && body && !(body instanceof FormData)) {
		headers.set('Content-Type', 'application/json');
	}
	if (auth) {
		const token = getAccessToken();
		if (token) headers.set('Authorization', `Bearer ${token}`);
	}

	let response = await send(path, { ...options, headers });

	if (auth && response.status === 401 && (await tryRefresh())) {
		const token = getAccessToken();
		if (token) headers.set('Authorization', `Bearer ${token}`);
		response = await send(path, { ...options, headers });
	}

	if (!response.ok) {
		throw new ApiError(response.status, await parseJson(response));
	}
	return parseJson(response);
}

/** @param {string} path @param {RequestInit} options */
async function send(path, options) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		return await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal });
	} catch (e) {
		if (e instanceof Error && e.name === 'AbortError') {
			throw new ApiError(504, {}, 'Request timed out');
		}
		throw new ApiError(503, {}, 'API is unreachable');
	} finally {
		clearTimeout(timer);
	}
}

let refreshing = /** @type {Promise<boolean> | null} */ (null);

/** @returns {Promise<boolean>} */
function tryRefresh() {
	if (!browser) return Promise.resolve(false);
	if (refreshing) return refreshing;

	refreshing = (async () => {
		const refresh_token = getRefreshToken();
		if (!refresh_token) return false;
		try {
			const res = await send('/api/token/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refresh_token })
			});
			if (!res.ok) {
				clearSession();
				return false;
			}
			saveSession(await res.json());
			return true;
		} catch {
			return false;
		} finally {
			refreshing = null;
		}
	})();

	return refreshing;
}

/** @param {Record<string, any>} params */
function query(params) {
	const usp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
	}
	const s = usp.toString();
	return s ? `?${s}` : '';
}

// ---- Auth & profile ----------------------------------------------------

/** @param {{ email: string, password: string, username: string, name: string }} data */
export function register(data) {
	return request('/api/register', { method: 'POST', body: JSON.stringify(data) });
}

/** @param {{ email: string, password: string }} data */
export async function login(data) {
	const tokens = await request('/api/login', { method: 'POST', body: JSON.stringify(data) });
	saveSession(tokens);
	return tokens;
}

export async function logout() {
	try {
		await request('/api/logout', { method: 'POST' }, true);
	} finally {
		clearSession();
	}
}

export function getMe() {
	return request('/api/me', {}, true);
}

/** @param {{ username: string, name: string }} data */
export function updateProfile(data) {
	return request('/api/me', { method: 'PATCH', body: JSON.stringify(data) }, true);
}

/** @param {{ currentPassword: string, newPassword: string }} data */
export function changePassword(data) {
	return request('/api/me/password', { method: 'POST', body: JSON.stringify(data) }, true);
}

export function listMySessions() {
	return request('/api/me/sessions', {}, true);
}

/** @param {number} id */
export function revokeMySession(id) {
	return request(`/api/me/sessions/${id}`, { method: 'DELETE' }, true);
}

export function revokeOtherSessions() {
	return request('/api/me/sessions/others', { method: 'DELETE' }, true);
}

/** @param {string} username */
export function checkUsername(username) {
	return request(`/api/username/available${query({ username })}`);
}

export function getPreferences() {
	return request('/api/me/preferences', {}, true);
}

/** @param {any} prefs */
export function updatePreferences(prefs) {
	return request('/api/me/preferences', { method: 'PATCH', body: JSON.stringify(prefs) }, true);
}

// ---- Posts & categories (public) --------------------------------------

/** @param {{ q?: string, category?: string, limit?: number, offset?: number }} [params] */
export function listPosts(params = {}) {
	return request(`/api/posts${query(params)}`, {}, true);
}

/** @param {string} slug */
export function getPost(slug) {
	return request(`/api/posts/${slug}`, {}, true);
}

/** @param {{ q?: string, limit?: number, offset?: number }} [params] */
export function search(params = {}) {
	return request(`/api/search${query(params)}`, {}, true);
}

export function listCategories() {
	return request('/api/categories');
}

/** @param {string} slug */
export function getCategory(slug) {
	return request(`/api/categories/${slug}`, {}, true);
}

// ---- Interactions (authenticated) -------------------------------------

/** @param {number} id */
export function likePost(id) {
	return request(`/api/posts/${id}/like`, { method: 'POST' }, true);
}
/** @param {number} id */
export function unlikePost(id) {
	return request(`/api/posts/${id}/like`, { method: 'DELETE' }, true);
}
/** @param {number} id */
export function bookmarkPost(id) {
	return request(`/api/posts/${id}/bookmark`, { method: 'POST' }, true);
}
/** @param {number} id */
export function unbookmarkPost(id) {
	return request(`/api/posts/${id}/bookmark`, { method: 'DELETE' }, true);
}
/** @param {number} id @param {string} body @param {number | null} [parentId] */
export function addComment(id, body, parentId = null) {
	const payload = /** @type {{ body: string, parentId?: number }} */ ({ body });
	if (parentId != null) payload.parentId = parentId;
	return request(`/api/posts/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }, true);
}
/** @param {number} id */
export function deleteComment(id) {
	return request(`/api/comments/${id}`, { method: 'DELETE' }, true);
}
export function listBookmarks() {
	return request('/api/bookmarks', {}, true);
}

// ---- Admin authoring --------------------------------------------------

/** @param {{ limit?: number, offset?: number }} [params] */
export function adminListPosts(params = {}) {
	return request(`/api/admin/posts${query(params)}`, {}, true);
}
export function adminStats() {
	return request('/api/admin/stats', {}, true);
}
/** @param {{ limit?: number, offset?: number }} [params] */
export function adminListUsers(params = {}) {
	return request(`/api/admin/users${query(params)}`, {}, true);
}
/** @param {number} id @param {boolean} admin */
export function setUserAdmin(id, admin) {
	return request(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ admin }) }, true);
}
/** @param {number} id */
export function banUser(id) {
	return request(`/api/admin/users/${id}/ban`, { method: 'POST' }, true);
}
/** @param {number} id */
export function unbanUser(id) {
	return request(`/api/admin/users/${id}/unban`, { method: 'POST' }, true);
}
/** @param {number} id */
export function deleteUser(id) {
	return request(`/api/admin/users/${id}`, { method: 'DELETE' }, true);
}
/** @param {{ path: string }} data */
export function sendPresence(data) {
	return request('/api/presence', { method: 'POST', body: JSON.stringify(data) }, true);
}
/** @param {{ limit?: number, offset?: number, activeOnly?: boolean }} [params] */
export function adminListSessions(params = {}) {
	return request(`/api/admin/sessions${query(params)}`, {}, true);
}
/** @param {number} id */
export function adminRevokeSession(id) {
	return request(`/api/admin/sessions/${id}`, { method: 'DELETE' }, true);
}
export function adminLive() {
	return request('/api/admin/live', {}, true);
}
/** @param {{ limit?: number, offset?: number, q?: string }} [params] */
export function adminListComments(params = {}) {
	return request(`/api/admin/comments${query(params)}`, {}, true);
}
/** @param {number} id @param {string} body */
export function adminUpdateComment(id, body) {
	return request(`/api/admin/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) }, true);
}
/** @param {number} id */
export function adminDeleteComment(id) {
	return request(`/api/admin/comments/${id}`, { method: 'DELETE' }, true);
}
/** @param {number} id @param {{ name: string, description?: string|null, parentId?: number|null }} data */
export function updateCategory(id, data) {
	return request(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true);
}
/** @param {number} id */
export function deleteCategory(id) {
	return request(`/api/admin/categories/${id}`, { method: 'DELETE' }, true);
}
/** @param {number} id */
export function adminGetPost(id) {
	return request(`/api/admin/posts/${id}`, {}, true);
}
/** @param {any} data */
export function createPost(data) {
	return request('/api/admin/posts', { method: 'POST', body: JSON.stringify(data) }, true);
}
/** @param {number} id @param {any} data */
export function updatePost(id, data) {
	return request(`/api/admin/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true);
}
/** @param {number} id */
export function deletePost(id) {
	return request(`/api/admin/posts/${id}`, { method: 'DELETE' }, true);
}
/**
 * Add a step to a guide. Either reference an existing post ({ childPostId }) or
 * create a new one and attach it ({ title, summary?, body?, categoryIds? }).
 * @param {number} id
 * @param {{ childPostId?: number, title?: string, summary?: string|null, body?: string|null, categoryIds?: number[], position?: number }} data
 */
export function addStep(id, data) {
	return request(`/api/admin/posts/${id}/steps`, { method: 'POST', body: JSON.stringify(data) }, true);
}
/** @param {number} id @param {number} childId */
export function removeStep(id, childId) {
	return request(`/api/admin/posts/${id}/steps/${childId}`, { method: 'DELETE' }, true);
}
/** @param {number} id @param {number} childId @param {string|null} note */
export function setStepNote(id, childId, note) {
	return request(`/api/admin/posts/${id}/steps/${childId}`, { method: 'PATCH', body: JSON.stringify({ note }) }, true);
}
/** @param {number} id @param {number[]} postIds child-post ids in order */
export function reorderSteps(id, postIds) {
	return request(`/api/admin/posts/${id}/steps/order`, { method: 'PATCH', body: JSON.stringify({ postIds }) }, true);
}
/** @param {{ name: string, description?: string, slug?: string }} data */
export function createCategory(data) {
	return request('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) }, true);
}
/** Upload an image or video; returns { url, kind }. @param {File} file */
export function uploadImage(file) {
	const fd = new FormData();
	fd.append('file', file);
	return request('/api/admin/uploads', { method: 'POST', body: fd }, true);
}

/** @param {File} file */
export function uploadMedia(file) {
	return uploadImage(file);
}
