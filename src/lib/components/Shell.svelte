<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as api from '$lib/api/client';
	import { auth } from '$lib/auth/auth.svelte';
	import { theme } from '$lib/theme/theme.svelte';
	import Avatar from '$lib/components/Avatar.svelte';

	let q = $state('');
	let menuOpen = $state(false);
	let navOpen = $state(false);

	let searchOpen = $state(false);
	let searchLoading = $state(false);
	/** @type {any[]} */
	let searchHits = $state([]);
	/** @type {string | null} */
	let searchSuggestion = $state(null);
	let searchTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
	let searchSeq = 0;

	let path = $derived($page.url.pathname);
	let isHome = $derived(path === '/');
	let isReading = $derived(path.startsWith('/post/'));
	let isAuth = $derived(path === '/login' || path === '/register');
	let onTopics = $derived(path.startsWith('/categories') || path.startsWith('/category/'));
	let onSaved = $derived(path.startsWith('/bookmarks'));
	let onTodos = $derived(path.startsWith('/todos'));
	let onStudio = $derived(path.startsWith('/admin'));

	$effect(() => {
		if (path === '/search') q = $page.url.searchParams.get('q') ?? '';
		navOpen = false;
		searchOpen = false;
	});

	function closeOverlays() {
		menuOpen = false;
		navOpen = false;
		searchOpen = false;
	}

	function submitSearch(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		const term = q.trim();
		if (!term) return;
		searchOpen = false;
		goto(`/search?q=${encodeURIComponent(term)}`);
	}

	function onSearchInput() {
		const term = q.trim();
		if (searchTimer) clearTimeout(searchTimer);
		if (term.length < 2) {
			searchHits = [];
			searchSuggestion = null;
			searchLoading = false;
			searchOpen = term.length > 0;
			return;
		}
		searchOpen = true;
		searchLoading = true;
		const seq = ++searchSeq;
		searchTimer = setTimeout(async () => {
			try {
				const res = await api.search({ q: term, limit: 6, offset: 0 });
				if (seq !== searchSeq) return;
				searchHits = res.items ?? [];
				searchSuggestion = res.suggestion ?? null;
			} catch {
				if (seq !== searchSeq) return;
				searchHits = [];
				searchSuggestion = null;
			} finally {
				if (seq === searchSeq) searchLoading = false;
			}
		}, 220);
	}

	function pickHit(/** @type {any} */ post) {
		searchOpen = false;
		goto(`/post/${post.slug}`);
	}

	function useSuggestion() {
		if (!searchSuggestion) return;
		q = searchSuggestion;
		searchOpen = false;
		goto(`/search?q=${encodeURIComponent(searchSuggestion)}`);
	}

	function cycleTheme() {
		const order = /** @type {const} */ (['light', 'dark', 'system']);
		theme.set(order[(order.indexOf(theme.choice) + 1) % order.length]);
	}

	async function logout() {
		menuOpen = false;
		await auth.logout();
		goto('/');
	}

	const themeTitle = { light: 'Light', dark: 'Dark', system: 'System' };
</script>

<svelte:window onclick={closeOverlays} />

{#if !isAuth}
	<header class="bar">
		<div
			class="bar-inner frame"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="presentation"
		>
			<a href="/" class="logo" aria-label="Runbook home">
				<span class="logo-mark" aria-hidden="true"></span>
				<span class="logo-text">Runbook</span>
			</a>

			<nav class="nav" class:open={navOpen} aria-label="Primary">
				<a href="/" class:on={isHome || isReading} onclick={() => (navOpen = false)}>Notes</a>
				<a href="/categories" class:on={onTopics} onclick={() => (navOpen = false)}>Topics</a>
				{#if auth.isAuthenticated}
					<a href="/bookmarks" class:on={onSaved} onclick={() => (navOpen = false)}>Saved</a>
					<a href="/todos" class:on={onTodos} onclick={() => (navOpen = false)}>Todos</a>
				{/if}
			</nav>

			<div class="search-wrap">
				<form class="search" onsubmit={submitSearch} role="search">
					<svg class="search-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
						<path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
					<input
						type="search"
						placeholder="Search notes…"
						bind:value={q}
						oninput={onSearchInput}
						onfocus={() => {
							if (q.trim().length >= 2 || searchHits.length) searchOpen = true;
						}}
						onkeydown={(e) => {
							if (e.key === 'Escape') searchOpen = false;
						}}
						aria-label="Search"
						aria-controls="search-dropdown"
						autocomplete="off"
					/>
				</form>

				{#if searchOpen && q.trim()}
					<div class="search-drop" id="search-dropdown" role="listbox" aria-label="Search results">
						{#if q.trim().length < 2}
							<p class="drop-hint muted">Type at least 2 characters…</p>
						{:else if searchLoading && !searchHits.length}
							<p class="drop-hint muted">Searching…</p>
						{:else if searchHits.length}
							{#each searchHits as hit (hit.id)}
								<button type="button" class="drop-item" onclick={() => pickHit(hit)}>
									<span class="drop-title">{hit.title}</span>
									{#if hit.summary}
										<span class="drop-sum">{hit.summary}</span>
									{/if}
									<span class="drop-meta">
										{#if hit.isGuide}<span class="badge badge-guide">Guide</span>{/if}
										{#if hit.categories?.[0]}<span class="muted">{hit.categories[0].name}</span>{/if}
									</span>
								</button>
							{/each}
							<a class="drop-all" href="/search?q={encodeURIComponent(q.trim())}" onclick={() => (searchOpen = false)}>
								See all results
							</a>
						{:else}
							<p class="drop-hint muted">No matches{searchLoading ? '…' : ''}.</p>
							{#if searchSuggestion}
								<button type="button" class="drop-suggest" onclick={useSuggestion}>
									Did you mean <strong>{searchSuggestion}</strong>?
								</button>
							{/if}
							<a class="drop-all" href="/search?q={encodeURIComponent(q.trim())}" onclick={() => (searchOpen = false)}>
								Open full search
							</a>
						{/if}
					</div>
				{/if}
			</div>

			<div class="tools">
				<button
					type="button"
					class="icon-btn"
					onclick={cycleTheme}
					title="Theme: {themeTitle[theme.choice]}"
					aria-label="Toggle theme ({themeTitle[theme.choice]})"
				>
					{#if theme.choice === 'dark'}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linejoin="round"
							/>
						</svg>
					{:else if theme.choice === 'system'}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.75" />
							<path d="M8 21h8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
						</svg>
					{:else}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.75" />
							<path
								d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
							/>
						</svg>
					{/if}
				</button>

				<button
					type="button"
					class="icon-btn menu-toggle"
					aria-label="Menu"
					aria-expanded={navOpen}
					onclick={(e) => {
						e.stopPropagation();
						navOpen = !navOpen;
						menuOpen = false;
						searchOpen = false;
					}}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
					</svg>
				</button>

				{#if auth.isAuthenticated}
					<div class="menu-wrap">
						<button
							type="button"
							class="avatar-btn"
							onclick={(e) => {
								e.stopPropagation();
								menuOpen = !menuOpen;
								navOpen = false;
								searchOpen = false;
							}}
							aria-label="Account"
							aria-expanded={menuOpen}
						>
							<Avatar user={auth.user} size={28} />
						</button>
						{#if menuOpen}
							<div class="menu" role="menu">
								<div class="menu-head">
									<strong>{auth.user?.name}</strong>
									<span class="faint">@{auth.user?.username}</span>
								</div>
								{#if auth.isAdmin}
									<a href="/admin" class:on={onStudio} onclick={() => (menuOpen = false)}>Admin</a>
								{/if}
								<a href="/settings" onclick={() => (menuOpen = false)}>Settings</a>
								<button type="button" onclick={logout}>Log out</button>
							</div>
						{/if}
					</div>
				{:else}
					<a class="login" href="/login">Log in</a>
					<a class="btn btn-sm join" href="/register">Join</a>
				{/if}
			</div>
		</div>
	</header>
{/if}

<style>
	.bar {
		position: sticky;
		top: 0;
		z-index: 60;
		background: color-mix(in srgb, var(--stone) 88%, transparent);
		backdrop-filter: blur(14px) saturate(1.15);
		border-bottom: 1px solid var(--line-soft);
		padding-left: var(--page-pad);
		padding-right: var(--page-pad);
		box-sizing: border-box;
	}

	/* prevent header interactions from immediately closing menus via window handler */
	.bar-inner {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 1rem 1.25rem;
		min-height: 3.5rem;
		padding-top: 0.55rem;
		padding-bottom: 0.55rem;
	}

	.logo {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--ink-strong);
		text-decoration: none;
		flex-shrink: 0;
	}

	.logo:hover {
		color: var(--accent);
		text-decoration: none;
	}

	.logo-mark {
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 3px;
		background: var(--accent);
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--sheet) 35%, transparent);
		position: relative;
	}

	.logo-mark::after {
		content: '';
		position: absolute;
		inset: 4px 5px;
		border-top: 1.5px solid var(--accent-contrast);
		border-bottom: 1.5px solid var(--accent-contrast);
		opacity: 0.9;
	}

	.logo-text {
		font-family: var(--font-ui);
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: -0.01em;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 0.15rem 1rem;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.nav a {
		color: var(--muted);
		text-decoration: none;
		padding: 0.3rem 0;
	}

	.nav a:hover,
	.nav a.on {
		color: var(--ink-strong);
		text-decoration: none;
	}

	.nav a.on {
		box-shadow: inset 0 -2px 0 var(--mark);
	}

	.search-wrap {
		position: relative;
		min-width: 0;
		max-width: 28rem;
		justify-self: stretch;
		width: 100%;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		width: 100%;
		padding: 0.45rem 0.75rem;
		background: var(--sheet);
		border: 1px solid var(--line);
		border-radius: var(--radius);
	}

	.search:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}

	.search-ico {
		flex-shrink: 0;
		color: var(--faint);
	}

	.search input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		padding: 0;
		font-size: 0.9rem;
		color: var(--ink);
	}

	.search input:focus {
		outline: none;
	}

	.search-drop {
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 0;
		right: 0;
		z-index: 80;
		max-height: min(70vh, 24rem);
		overflow: auto;
		background: var(--sheet);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sheet);
		padding: 0.35rem;
	}

	.drop-hint {
		margin: 0;
		padding: 0.75rem 0.85rem;
		font-size: 0.85rem;
	}

	.drop-item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
		width: 100%;
		text-align: left;
		border: none;
		background: transparent;
		padding: 0.65rem 0.75rem;
		border-radius: var(--radius);
		cursor: pointer;
		color: inherit;
	}

	.drop-item:hover {
		background: var(--page);
	}

	.drop-title {
		font-family: var(--font-ui);
		font-weight: 650;
		font-size: 0.9rem;
		color: var(--ink-strong);
		line-height: 1.3;
	}

	.drop-sum {
		font-size: 0.8rem;
		color: var(--muted);
		line-height: 1.35;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.drop-meta {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 0.15rem;
		font-size: 0.75rem;
	}

	.drop-suggest {
		display: block;
		width: 100%;
		text-align: left;
		border: none;
		background: var(--accent-soft);
		color: var(--ink);
		padding: 0.65rem 0.85rem;
		border-radius: var(--radius);
		font-size: 0.85rem;
		cursor: pointer;
		margin-bottom: 0.25rem;
	}

	.drop-suggest:hover {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
	}

	.drop-all {
		display: block;
		padding: 0.65rem 0.75rem;
		font-size: 0.82rem;
		font-weight: 650;
		color: var(--accent);
		text-decoration: none;
		border-top: 1px solid var(--line-soft);
		margin-top: 0.2rem;
	}

	.drop-all:hover {
		background: var(--page);
		text-decoration: none;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.15rem;
		height: 2.15rem;
		border: 1px solid transparent;
		border-radius: var(--radius);
		background: transparent;
		color: var(--muted);
	}

	.icon-btn:hover {
		color: var(--ink);
		background: var(--page);
		border-color: var(--line-soft);
	}

	.menu-toggle {
		display: none;
	}

	.login {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--muted);
		padding: 0.35rem 0.5rem;
		text-decoration: none;
	}

	.login:hover {
		color: var(--accent);
		text-decoration: none;
	}

	.menu-wrap {
		position: relative;
	}

	.avatar-btn {
		border: none;
		background: none;
		padding: 0;
		display: flex;
		border-radius: var(--radius-sm);
	}

	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 0.45rem);
		min-width: 11.5rem;
		background: var(--sheet);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		box-shadow: var(--shadow-sheet);
		padding: 0.35rem;
		z-index: 70;
	}

	.menu-head {
		display: flex;
		flex-direction: column;
		padding: 0.45rem 0.6rem 0.55rem;
		border-bottom: 1px solid var(--line-soft);
		margin-bottom: 0.25rem;
		font-size: 0.85rem;
	}

	.menu a,
	.menu button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.6rem;
		border: none;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--ink);
		font-size: 0.88rem;
		font-weight: 500;
		text-decoration: none;
	}

	.menu a:hover,
	.menu button:hover {
		background: var(--page);
		text-decoration: none;
	}

	@media (max-width: 860px) {
		.bar-inner {
			grid-template-columns: auto minmax(0, 1fr) auto;
			gap: 0.65rem 0.75rem;
			grid-template-areas:
				'logo search tools'
				'nav nav nav';
		}

		.logo {
			grid-area: logo;
		}
		.search-wrap {
			grid-area: search;
			max-width: none;
			width: 100%;
		}
		.search {
			max-width: none;
			width: 100%;
		}
		.tools {
			grid-area: tools;
		}

		.menu-toggle {
			display: inline-flex;
		}

		.nav {
			display: none;
			grid-area: nav;
			flex-wrap: wrap;
			gap: 0.35rem 1rem;
			padding-top: 0.15rem;
			padding-bottom: 0.35rem;
		}

		.nav.open {
			display: flex;
		}

		.join {
			display: none;
		}
	}

	@media (max-width: 520px) {
		.logo-text {
			display: none;
		}

		.search {
			padding-inline: 0.55rem;
		}

		.login {
			display: none;
		}

		.bar-inner {
			min-height: 3.15rem;
			gap: 0.5rem;
		}
	}
</style>
