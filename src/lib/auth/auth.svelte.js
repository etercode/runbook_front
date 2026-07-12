import { browser } from '$app/environment';
import * as api from '$lib/api/client';
import { getAccessToken } from '$lib/auth/session';

/**
 * @typedef {{ id: number, email: string, username: string, name: string, roles?: string[] }} User
 */

class AuthState {
	/** @type {User | null} */
	user = $state(null);
	loading = $state(false);
	initialized = $state(false);

	// Reactive auth flag. A getter over localStorage isn't reactive, so the
	// header wouldn't update on sign in/out without a refresh — track it here
	// and keep it in sync on every login/logout/init.
	authed = $state(false);

	get isAuthenticated() {
		return this.authed;
	}

	get isAdmin() {
		return this.user?.roles?.includes('ROLE_ADMIN') ?? false;
	}

	async init() {
		if (!browser || this.initialized) return;
		this.initialized = true;
		this.authed = getAccessToken() !== null;
		if (this.authed) await this.fetchUser();
	}

	async fetchUser() {
		if (!browser || getAccessToken() === null) {
			this.authed = false;
			this.user = null;
			return;
		}
		this.authed = true;
		this.loading = true;
		try {
			this.user = await api.getMe();
		} catch {
			this.user = null;
			// The token may have been cleared by a failed refresh — re-sync.
			this.authed = getAccessToken() !== null;
		} finally {
			this.loading = false;
		}
	}

	/** @param {string} email @param {string} password */
	async login(email, password) {
		await api.login({ email, password });
		this.authed = true;
		await this.fetchUser();
	}

	async logout() {
		try {
			await api.logout();
		} finally {
			this.authed = false;
			this.user = null;
		}
	}
}

export const auth = new AuthState();
