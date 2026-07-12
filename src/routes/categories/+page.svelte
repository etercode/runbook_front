<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';

	let categories = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await api.listCategories();
			categories = res.items ?? [];
		} catch {
			/* ignore */
		} finally {
			loading = false;
		}
	});

	let topLevel = $derived(categories.filter((c) => !c.parentId));
	let childrenOf = $derived((/** @type {number} */ id) => categories.filter((c) => c.parentId === id));
</script>

<svelte:head><title>Topics — Runbook</title></svelte:head>

<div class="wall frame">
	<header class="wall-head anim-up">
		<p class="kicker">Index</p>
		<h1>Topics</h1>
		<p class="lede">Every subject you’ve filed a note under — open one and keep reading.</p>
	</header>

	{#if loading}
		<div class="center-state"><span class="spinner"></span></div>
	{:else if topLevel.length === 0}
		<div class="empty-state">No topics yet.</div>
	{:else}
		<ul class="topics anim-up-2">
			{#each topLevel as cat, i (cat.id)}
				<li style="--i: {i}">
					<a class="topic" href="/category/{cat.slug}">
						<span class="name">{cat.name}</span>
						<span class="count">{cat.postCount}</span>
					</a>
					{#if cat.description}
						<p class="desc">{cat.description}</p>
					{/if}
					{#if childrenOf(cat.id).length}
						<div class="subs">
							{#each childrenOf(cat.id) as sub (sub.id)}
								<a href="/category/{sub.slug}">{sub.name}</a>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.wall {
		padding: 3.5rem 0 5rem;
	}

	.wall-head {
		max-width: 28rem;
		margin-bottom: 3rem;
	}

	.kicker {
		margin: 0 0 0.75rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--mark);
	}

	.wall-head h1 {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: clamp(2rem, 5vw, 2.75rem);
		letter-spacing: -0.02em;
		line-height: 1.15;
		margin: 0 0 0.75rem;
	}

	.lede {
		margin: 0;
		font-family: var(--font-read);
		font-size: 1.15rem;
		line-height: 1.5;
		color: var(--muted);
	}

	.topics {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.topics li {
		padding: 1.75rem 0;
		border-top: 1px solid var(--line);
		animation: fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
		animation-delay: calc(var(--i) * 40ms);
	}

	.topics li:last-child {
		border-bottom: 1px solid var(--line);
	}

	.topic {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1.5rem;
		color: var(--ink-strong);
		text-decoration: none;
	}

	.topic:hover {
		color: var(--accent);
		text-decoration: none;
	}

	.name {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: clamp(1.35rem, 3vw, 1.85rem);
		letter-spacing: -0.015em;
		line-height: 1.2;
	}

	.count {
		font-variant-numeric: tabular-nums;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--faint);
		flex-shrink: 0;
	}

	.topic:hover .count {
		color: var(--mark);
	}

	.desc {
		margin: 0.55rem 0 0;
		max-width: 36rem;
		font-family: var(--font-read);
		font-size: 1.02rem;
		color: var(--muted);
		line-height: 1.5;
	}

	.subs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.85rem;
		margin-top: 0.85rem;
	}

	.subs a {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--muted);
	}

	.subs a:hover {
		color: var(--accent);
	}
</style>
