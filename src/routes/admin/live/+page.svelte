<script>
	import { onDestroy, onMount } from 'svelte';
	import * as api from '$lib/api/client';
	import Avatar from '$lib/components/Avatar.svelte';

	let items = $state(/** @type {any[]} */ ([]));
	let total = $state(0);
	let asOf = $state('');
	let loading = $state(true);
	let error = $state('');
	/** @type {ReturnType<typeof setInterval> | null} */
	let timer = null;

	async function load() {
		try {
			const res = await api.adminLive();
			items = res.items ?? [];
			total = res.total ?? items.length;
			asOf = res.asOf ?? '';
			error = '';
		} catch {
			error = 'Failed to load live presence.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
		timer = setInterval(load, 8000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	/** @param {number | null | undefined} secs */
	function agoLabel(secs) {
		if (secs == null) return '—';
		if (secs < 5) return 'now';
		if (secs < 60) return `${secs}s ago`;
		return `${Math.floor(secs / 60)}m ago`;
	}

	/** @param {string | null | undefined} path */
	function pageLabel(path) {
		if (!path || path === '/') return 'Home';
		if (path.startsWith('/post/')) return `Reading · ${path.slice(6)}`;
		if (path.startsWith('/admin')) return `Studio · ${path}`;
		if (path.startsWith('/search')) return 'Search';
		if (path.startsWith('/category')) return 'Topic';
		if (path.startsWith('/bookmarks')) return 'Saved';
		return path;
	}
</script>

<svelte:head><title>Live — Studio</title></svelte:head>

<div class="studio-header">
	<div>
		<h2 class="studio-title">Live</h2>
		<p class="studio-subtitle">
			{total} active right now
			{#if asOf}<span class="muted"> · updates every few seconds</span>{/if}
		</p>
	</div>
	<button class="btn btn-ghost btn-sm" onclick={load}>Refresh</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

{#if loading}
	<div class="center-state"><span class="spinner"></span></div>
{:else if items.length === 0}
	<div class="empty-state">Nobody online in the last 90 seconds.</div>
{:else}
	<ul class="live-list">
		{#each items as row (row.id)}
			<li class="live-card">
				<div class="who">
					<span class="dot" aria-hidden="true"></span>
					{#if row.user}
						<Avatar user={row.user} size={36} />
						<div>
							<strong>{row.user.name}</strong>
							<span class="muted">@{row.user.username}</span>
						</div>
					{/if}
					<span class="ago">{agoLabel(row.secondsAgo)}</span>
				</div>
				<p class="page">{pageLabel(row.path)}</p>
				<p class="meta muted">
					<span class="mono">{row.ipAddress ?? '—'}</span>
					<span>·</span>
					<span>{row.device}</span>
				</p>
				{#if row.path}
					<p class="raw mono muted">{row.path}</p>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.live-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: 0.85rem;
	}

	.live-card {
		padding: 1rem 1.1rem;
		background: var(--sheet);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.who {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin-bottom: 0.75rem;
	}

	.who > div {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.who strong {
		font-size: 0.95rem;
	}

	.who .muted {
		font-size: 0.8rem;
	}

	.dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--ok);
		box-shadow: 0 0 0 3px var(--ok-soft);
		flex-shrink: 0;
	}

	.ago {
		font-size: 0.78rem;
		font-weight: 650;
		color: var(--ok);
		white-space: nowrap;
	}

	.page {
		margin: 0 0 0.45rem;
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: 1.05rem;
		color: var(--ink-strong);
		letter-spacing: -0.015em;
	}

	.meta {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		font-size: 0.8rem;
	}

	.raw {
		margin: 0.45rem 0 0;
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mono {
		font-family: var(--font-mono);
	}
</style>
