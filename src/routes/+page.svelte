<script>
	import { page } from '$app/stores';
	import * as api from '$lib/api/client';
	import PostEntry from '$lib/components/PostEntry.svelte';

	const PAGE = 20;

	let posts = $state(/** @type {any[]} */ ([]));
	let total = $state(0);
	let categories = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');

	let activeCategory = $derived($page.url.searchParams.get('category') ?? '');
	let topCategories = $derived(categories.filter((c) => !c.parentId));
	let featured = $derived(!activeCategory && posts.length ? posts[0] : null);
	let rest = $derived(featured ? posts.slice(1) : posts);

	$effect(() => {
		api.listCategories()
			.then((res) => (categories = res.items ?? []))
			.catch(() => {});
	});

	$effect(() => {
		const category = activeCategory;
		loading = true;
		error = '';
		api.listPosts({ category, limit: PAGE, offset: 0 })
			.then((res) => {
				posts = res.items ?? [];
				total = res.total ?? posts.length;
			})
			.catch((e) => (error = e?.status === 503 ? 'Cannot reach the API.' : 'Failed to load notes.'))
			.finally(() => (loading = false));
	});

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		try {
			const res = await api.listPosts({
				category: activeCategory,
				limit: PAGE,
				offset: posts.length
			});
			posts = [...posts, ...(res.items ?? [])];
		} catch {
			/* ignore */
		} finally {
			loadingMore = false;
		}
	}

	let canLoadMore = $derived(posts.length < total);
	let activeName = $derived(
		topCategories.find((c) => c.slug === activeCategory)?.name ?? activeCategory
	);
</script>

<svelte:head><title>Runbook</title></svelte:head>

<section class="home frame">
	<header class="intro anim-up">
		{#if activeCategory}
			<p class="crumbs">
				<a href="/">Notes</a>
				<span class="topic-sep">/</span>
				<span>{activeName}</span>
			</p>
			<h1>{activeName}</h1>
		{:else}
			<h1>Your learning, kept.</h1>
			<p class="lede">
				Step-by-step notes and guides — so what you learn today is still here next month.
			</p>
		{/if}
	</header>

	{#if topCategories.length}
		<nav class="filters" aria-label="Filter by topic">
			<a class="topic-link" class:on={!activeCategory} href="/">All</a>
			{#each topCategories as cat, i (cat.id)}
				<span class="topic-sep" aria-hidden="true">·</span>
				<a class="topic-link" class:on={activeCategory === cat.slug} href="/?category={cat.slug}">
					{cat.name}
				</a>
			{/each}
			<span class="topic-sep browse-sep" aria-hidden="true">·</span>
			<a class="topic-link browse" href="/categories">Browse topics</a>
		</nav>
	{/if}

	{#if loading}
		<div class="center-state"><span class="spinner"></span></div>
	{:else if error}
		<div class="alert alert-error">{error}</div>
	{:else if posts.length === 0}
		<div class="empty-state">
			{#if activeCategory}
				Nothing in this topic yet.
			{:else}
				No notes yet — the first one you save will show up here.
			{/if}
		</div>
	{:else}
		<div class="feed anim-up-2">
			{#if featured}
				<PostEntry post={featured} featured />
			{/if}
			{#if rest.length}
				<ul class="rows">
					{#each rest as post (post.id)}
						<PostEntry {post} />
					{/each}
				</ul>
			{/if}
			{#if canLoadMore}
				<div class="load-more">
					<button class="btn btn-ghost" onclick={loadMore} disabled={loadingMore}>
						{loadingMore ? 'Loading…' : 'Earlier notes'}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.home {
		padding: 2.25rem 0 4.5rem;
	}

	.intro {
		max-width: 40rem;
		margin-bottom: 1.5rem;
	}

	.crumbs {
		margin: 0 0 0.65rem;
		font-size: 0.88rem;
		color: var(--muted);
	}

	.crumbs a {
		color: var(--muted);
		font-weight: 600;
	}

	.intro h1 {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: clamp(1.75rem, 3.5vw, 2.35rem);
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin: 0 0 0.55rem;
		color: var(--ink-strong);
	}

	.lede {
		margin: 0;
		font-family: var(--font-read);
		font-size: 1.1rem;
		line-height: 1.55;
		color: var(--muted);
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.15rem;
		margin-bottom: 1.75rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--line);
	}

	.browse-sep,
	.browse {
		margin-left: 0.15rem;
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.load-more {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}

	@media (max-width: 640px) {
		.home {
			padding-top: 1.5rem;
		}

		.filters {
			gap: 0.45rem 0.1rem;
		}
	}
</style>
