import { browser } from '$app/environment';
import { getPreferences, updatePreferences } from '$lib/api/client';

const STORAGE_KEY = 'runbook_theme';

/** @typedef {'light' | 'dark' | 'system'} ThemeChoice */

/**
 * Theme controller. The user picks light, dark, or system; `system` follows the
 * OS preference live. The resolved theme is written as data-theme on <html>,
 * which drives the CSS variables in app.css. Persisted to localStorage
 * immediately and synced to the server preferences when signed in.
 */
class ThemeState {
	/** @type {ThemeChoice} */
	choice = $state('system');
	/** @type {'light' | 'dark'} */
	resolved = $state('light');
	initialized = false;
	/** @type {MediaQueryList | null} */
	#mq = null;

	init() {
		if (!browser || this.initialized) return;
		this.initialized = true;

		const stored = /** @type {ThemeChoice | null} */ (localStorage.getItem(STORAGE_KEY));
		if (stored === 'light' || stored === 'dark' || stored === 'system') {
			this.choice = stored;
		}

		this.#mq = window.matchMedia('(prefers-color-scheme: dark)');
		this.#mq.addEventListener('change', () => {
			if (this.choice === 'system') this.apply();
		});

		this.apply();
		this.syncFromServer();
	}

	/** @param {ThemeChoice} choice */
	set(choice) {
		this.choice = choice;
		if (browser) localStorage.setItem(STORAGE_KEY, choice);
		this.apply();
		this.persist();
	}

	apply() {
		if (!browser) return;
		const systemDark = this.#mq?.matches ?? false;
		this.resolved = this.choice === 'system' ? (systemDark ? 'dark' : 'light') : this.choice;
		document.documentElement.setAttribute('data-theme', this.resolved);
	}

	async syncFromServer() {
		try {
			const remote = await getPreferences();
			const theme = remote?.appearance?.theme;
			if (theme === 'light' || theme === 'dark' || theme === 'system') {
				this.choice = theme;
				localStorage.setItem(STORAGE_KEY, theme);
				this.apply();
			}
		} catch {
			// Not signed in / API down — local choice stands.
		}
	}

	async persist() {
		try {
			await updatePreferences({ appearance: { theme: this.choice } });
		} catch {
			// Saved locally; server sync is best-effort.
		}
	}
}

export const theme = new ThemeState();
