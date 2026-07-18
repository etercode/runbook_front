<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as api from '$lib/api/client';
	import { auth } from '$lib/auth/auth.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import Comments from '$lib/components/Comments.svelte';
	import GuideSteps from '$lib/components/GuideSteps.svelte';
	import { timeAgo } from '$lib/util/format';

	let post = $state(/** @type {any} */ (null));
	let loading = $state(true);
	let error = $state('');
	let busy = $state(false);

	let slug = $derived($page.params.slug);
	/** Guides that include this post as a step (with their full step lists). */
	let parentGuides = $derived(
		(post?.partOf ?? []).filter((g) => Array.isArray(g.steps) && g.steps.length > 0)
	);
	let primaryGuide = $derived(parentGuides[0] ?? null);

	$effect(() => {
		loading = true;
		error = '';
		api.getPost(slug)
			.then((res) => (post = res))
			.catch((e) => (error = e?.status === 404 ? 'This note could not be found.' : 'Failed to load.'))
			.finally(() => (loading = false));
	});

	function requireAuth() {
		if (!auth.isAuthenticated) {
			goto(`/login?next=/post/${slug}`);
			return false;
		}
		return true;
	}

	async function toggleLike() {
		if (!requireAuth() || busy) return;
		busy = true;
		try {
			const res = post.liked ? await api.unlikePost(post.id) : await api.likePost(post.id);
			post.liked = res.liked;
			post.likeCount = res.likeCount;
		} catch {
			/* ignore */
		} finally {
			busy = false;
		}
	}

	async function toggleBookmark() {
		if (!requireAuth() || busy) return;
		busy = true;
		try {
			const res = post.bookmarked
				? await api.unbookmarkPost(post.id)
				: await api.bookmarkPost(post.id);
			post.bookmarked = res.bookmarked;
		} catch {
			/* ignore */
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>{post ? `${post.title} — Runbook` : 'Runbook'}</title></svelte:head>

<div class="page frame">
	{#if loading}
		<div class="center-state"><span class="spinner"></span></div>
	{:else if error}
		<div class="alert alert-error">{error}</div>
		<a href="/" class="btn btn-ghost btn-sm">Back to notes</a>
	{:else if post}
		<article class="anim-up">
			{#if primaryGuide}
				<a class="back" href="/post/{primaryGuide.slug}">← {primaryGuide.title}</a>
			{:else}
				<a class="back" href="/">← Notes</a>
			{/if}

			<header class="head">
				{#if post.categories?.length || post.isGuide}
					<p class="cats">
						{#each post.categories ?? [] as cat, i (cat.id)}
							{#if i > 0}<span class="topic-sep">·</span>{/if}
							<a class="topic-link" href="/category/{cat.slug}">{cat.name}</a>
						{/each}
						{#if post.isGuide}
							{#if post.categories?.length}<span class="topic-sep">·</span>{/if}
							<span class="badge badge-guide">Guide</span>
						{/if}
					</p>
				{/if}
				<h1>{post.title}</h1>
				{#if post.summary}<p class="lead">{post.summary}</p>{/if}
				<div class="byline">
					<Avatar user={post.author} size={28} />
					<span class="author">{post.author?.name}</span>
					<span class="faint">·</span>
					<span class="muted">{timeAgo(post.createdAt)}</span>
				</div>
			</header>

			<div class="actions">
				<button class="act" class:on={post.liked} onclick={toggleLike} disabled={busy}>
					{post.liked ? 'Liked' : 'Like'}
					<span>{post.likeCount}</span>
				</button>
				<button class="act" class:on={post.bookmarked} onclick={toggleBookmark} disabled={busy}>
					{post.bookmarked ? 'Saved' : 'Save'}
				</button>
				{#if auth.isAdmin}
					<a class="act edit" href="/admin/posts/{post.id}">Edit</a>
				{/if}
				<span class="act-count muted">{post.commentCount} comment{post.commentCount === 1 ? '' : 's'}</span>
			</div>

			{#if parentGuides.length}
				{#each parentGuides as guide (guide.id)}
					<GuideSteps
						steps={guide.steps}
						{guide}
						currentPostId={post.id}
						showNotes={false}
						heading="In this guide"
					/>
				{/each}
			{/if}

			{#if post.body}
				<div class="body"><Markdown source={post.body} /></div>
			{/if}

			{#if post.steps?.length}
				<GuideSteps steps={post.steps} />
			{:else if parentGuides.length}
				{#each parentGuides as guide (guide.id)}
					<GuideSteps
						steps={guide.steps}
						currentPostId={post.id}
						showList={false}
						showPager={true}
					/>
				{/each}
			{/if}

			<section class="discussion">
				<Comments
					postId={post.id}
					bind:comments={post.comments}
					bind:commentCount={post.commentCount}
					loginNext={`/post/${slug}`}
				/>
			</section>
		</article>
	{/if}
</div>

<style>
	.page {
		padding: 2.25rem 0 4.5rem;
		width: 100%;
		min-width: 0;
	}

	.back {
		display: inline-block;
		margin-bottom: 1.25rem;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--muted);
	}

	.back:hover {
		color: var(--accent);
	}

	.head h1 {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: clamp(1.65rem, 3.2vw, 2.5rem);
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin: 0 0 0.75rem;
		color: var(--ink-strong);
		overflow-wrap: break-word;
	}

	.cats {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.15rem;
		margin: 0 0 0.75rem;
	}

	.lead {
		font-family: var(--font-read);
		font-size: clamp(1.1rem, 2vw, 1.25rem);
		line-height: 1.55;
		color: var(--muted);
		margin: 0 0 1.1rem;
		max-width: 52rem;
	}

	.byline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
		margin-bottom: 1.25rem;
	}

	.author {
		font-weight: 600;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 1rem;
		padding: 0.85rem 0;
		margin-bottom: 2rem;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}

	.act {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.15rem;
		border: none;
		background: none;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--muted);
	}

	.act:hover:not(:disabled) {
		color: var(--ink);
	}

	.act.on {
		color: var(--accent);
	}

	a.act {
		text-decoration: none;
	}

	a.act:hover {
		color: var(--ink);
		text-decoration: none;
	}

	.act.edit {
		color: var(--mark);
	}

	.act.edit:hover {
		color: var(--accent);
	}

	.act span {
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		opacity: 0.75;
	}

	.act-count {
		margin-left: auto;
		font-size: 0.88rem;
	}

	.body {
		margin-bottom: 2.75rem;
		min-width: 0;
		width: 100%;
	}

	.discussion {
		min-width: 0;
		width: 100%;
		margin-top: 3rem;
	}

	@media (max-width: 720px) {
		.page {
			padding: 1.35rem 0 3.5rem;
		}

		.head h1 {
			font-size: clamp(1.5rem, 7vw, 1.9rem);
		}

		.lead {
			max-width: none;
		}

		.act-count {
			margin-left: 0;
			width: 100%;
			order: 3;
		}
	}
</style>
