<script>
	import { page } from '$app/stores';
	import * as api from '$lib/api/client';
	import PostEntry from '$lib/components/PostEntry.svelte';

	let category = $state(/** @type {any} */ (null));
	let posts = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let error = $state('');

	let slug = $derived($page.params.slug);

	$effect(() => {
		loading = true;
		error = '';
		api.getCategory(slug)
			.then((res) => {
				category = res.category;
				posts = res.items ?? [];
			})
			.catch((e) => (error = e?.status === 404 ? 'Category not found.' : 'Failed to load.'))
			.finally(() => (loading = false));
	});
</script>

<svelte:head><title>{category ? `${category.name} — Runbook` : 'Runbook'}</title></svelte:head>

<div class="frame page">
	{#if loading}
		<div class="center-state"><span class="spinner"></span></div>
	{:else if error}
		<div class="alert alert-error">{error}</div>
	{:else if category}
		<header class="head anim-up">
			<nav class="crumbs">
				<a href="/categories">Topics</a>
				{#if category.parent}
					<span class="sep">/</span>
					<a href="/category/{category.parent.slug}">{category.parent.name}</a>
				{/if}
			</nav>
			<h1>{category.name}</h1>
			{#if category.description}<p class="desc">{category.description}</p>{/if}
			<p class="count faint">{category.postCount} note{category.postCount === 1 ? '' : 's'}</p>

			{#if category.children?.length}
				<div class="subs">
					{#each category.children as sub, i (sub.id)}
						{#if i > 0}<span class="topic-sep">·</span>{/if}
						<a class="topic-link" href="/category/{sub.slug}"
							>{sub.name}{#if sub.postCount}
								<span class="faint"> ({sub.postCount})</span>{/if}</a
						>
					{/each}
				</div>
			{/if}
		</header>

		{#if posts.length === 0}
			<div class="empty-state">Nothing in this topic yet.</div>
		{:else}
			<ul class="rows">
				{#each posts as post (post.id)}
					<PostEntry {post} />
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.page {
		padding: 3rem 0 5rem;
	}
	.head {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--line);
	}
	.crumbs {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		font-weight: 600;
		margin-bottom: 0.85rem;
	}
	.crumbs a {
		color: var(--muted);
	}
	.sep {
		color: var(--faint);
	}
	.head h1 {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: clamp(1.85rem, 4vw, 2.5rem);
		letter-spacing: -0.02em;
		line-height: 1.15;
		margin: 0 0 0.65rem;
	}
	.desc {
		font-family: var(--font-read);
		font-size: 1.1rem;
		line-height: 1.5;
		margin: 0;
		color: var(--muted);
		max-width: 36rem;
	}
	.count {
		margin: 0.65rem 0 0;
		font-size: 0.82rem;
	}
	.subs {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.1rem;
		margin-top: 1rem;
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}
</style>
