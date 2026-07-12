<script>
	import { timeAgo } from '$lib/util/format';

	/** @type {{ post: any, featured?: boolean }} */
	let { post, featured = false } = $props();

	let topics = $derived((post.categories ?? []).map((/** @type {any} */ c) => c.name).join(' · '));
</script>

{#if featured}
	<article class="feat">
		<a class="feat-hit" href="/post/{post.slug}" aria-label={post.title}></a>
		<div class="feat-kicker">
			<span>Latest</span>
			{#if post.isGuide}<span class="badge badge-guide">Guide · {post.stepCount}</span>{/if}
		</div>
		<h2 class="feat-title">{post.title}</h2>
		{#if post.summary}
			<p class="feat-sum">{post.summary}</p>
		{/if}
		<div class="feat-meta">
			<span>{post.author?.name}</span>
			<span class="sep">·</span>
			<span>{timeAgo(post.createdAt)}</span>
			{#if topics}
				<span class="sep">·</span>
				<span class="topics">{topics}</span>
			{/if}
			<span class="feat-go">Read</span>
		</div>
	</article>
{:else}
	<li class="row">
		<a class="row-hit" href="/post/{post.slug}" aria-label={post.title}></a>
		<div class="row-main">
			<h3 class="row-title">{post.title}</h3>
			{#if post.summary}
				<p class="row-sum">{post.summary}</p>
			{/if}
			{#if topics}
				<p class="row-topics">{topics}</p>
			{/if}
		</div>
		<div class="row-side">
			{#if post.isGuide}
				<span class="badge badge-guide">Guide</span>
			{/if}
			<span class="row-time">{timeAgo(post.createdAt)}</span>
			<span class="row-stats" aria-label="{post.likeCount} likes, {post.commentCount} comments">
				<span class="stat">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.6 12 20 12 20Z"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linejoin="round"
						/>
					</svg>
					{post.likeCount ?? 0}
				</span>
				<span class="stat">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V15H7.5A2.5 2.5 0 0 1 5 12.5v-6Z"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linejoin="round"
						/>
					</svg>
					{post.commentCount ?? 0}
				</span>
			</span>
		</div>
	</li>
{/if}

<style>
	.feat {
		position: relative;
		padding: 1.75rem 0 2rem;
		margin-bottom: 0.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
	}

	.feat-hit,
	.row-hit {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.feat-kicker,
	.feat-title,
	.feat-sum,
	.feat-meta,
	.row-main,
	.row-side {
		position: relative;
		z-index: 1;
		pointer-events: none;
	}

	.feat-kicker {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.65rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--mark);
	}

	.feat-title {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: clamp(1.5rem, 3vw, 2rem);
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin: 0 0 0.6rem;
		color: var(--ink-strong);
		max-width: 28rem;
	}

	.feat:hover .feat-title {
		color: var(--accent);
	}

	.feat-sum {
		font-family: var(--font-read);
		font-size: 1.1rem;
		line-height: 1.55;
		color: var(--muted);
		margin: 0 0 1rem;
		max-width: 40rem;
	}

	.feat-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.55rem;
		font-size: 0.85rem;
		color: var(--faint);
	}

	.topics,
	.row-topics {
		color: var(--muted);
	}

	.feat-go {
		margin-left: auto;
		font-weight: 700;
		color: var(--accent);
	}

	.sep {
		opacity: 0.5;
	}

	.row {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.25rem;
		align-items: baseline;
		padding: 1.2rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
		list-style: none;
	}

	.row:last-child {
		border-bottom: none;
	}

	.row:hover .row-title {
		color: var(--accent);
	}

	.row-title {
		font-family: var(--font-read);
		font-weight: 600;
		font-size: 1.15rem;
		line-height: 1.3;
		margin: 0;
		color: var(--ink-strong);
		letter-spacing: 0;
	}

	.row-sum {
		margin: 0.3rem 0 0;
		font-family: var(--font-read);
		font-size: 0.95rem;
		line-height: 1.45;
		color: var(--muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		max-width: 48rem;
	}

	.row-topics {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--faint);
	}

	.row-side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		text-align: right;
		font-size: 0.78rem;
		color: var(--faint);
		white-space: nowrap;
	}

	.row-time {
		font-variant-numeric: tabular-nums;
	}

	.row-stats {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		font-variant-numeric: tabular-nums;
	}

	.stat {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
	}

	.stat svg {
		flex-shrink: 0;
		opacity: 0.85;
	}

	@media (max-width: 640px) {
		.row {
			grid-template-columns: 1fr;
			gap: 0.4rem;
		}

		.row-side {
			flex-direction: row;
			align-items: center;
			gap: 0.65rem;
		}

		.feat-go {
			margin-left: 0;
		}

		.feat-title {
			max-width: none;
		}
	}
</style>
