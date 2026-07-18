<script>
	import Markdown from '$lib/components/Markdown.svelte';

	/**
	 * Ordered steps for a guide. On a lesson page, pass currentPostId to
	 * highlight the active step and optionally hide per-step notes.
	 *
	 * @type {{
	 *   steps: any[],
	 *   currentPostId?: number | null,
	 *   guide?: { slug: string, title: string } | null,
	 *   showNotes?: boolean,
	 *   showList?: boolean,
	 *   showPager?: boolean,
	 *   heading?: string
	 * }}
	 */
	let {
		steps = [],
		currentPostId = null,
		guide = null,
		showNotes = true,
		showList = true,
		showPager = false,
		heading = 'Steps'
	} = $props();

	let currentIndex = $derived(
		currentPostId == null ? -1 : steps.findIndex((s) => s.post?.id === currentPostId)
	);
	let prev = $derived(currentIndex > 0 ? steps[currentIndex - 1] : null);
	let next = $derived(
		currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null
	);
</script>

{#if steps?.length && (showList || (showPager && (prev || next)))}
	<section class="steps" class:pager-only={!showList}>
		{#if showList}
			<div class="steps-head">
				<h2 class="sec">{heading}</h2>
				{#if guide}
					<a class="guide-link" href="/post/{guide.slug}">{guide.title}</a>
				{/if}
			</div>
			<ol>
				{#each steps as step (step.post.id)}
					{@const current = currentPostId != null && step.post.id === currentPostId}
					<li class:current>
						{#if showNotes && step.note && !currentPostId}
							<div class="note"><Markdown source={step.note} /></div>
						{/if}
						{#if current}
							<div class="step" aria-current="step">
								<span class="num">{String(step.position).padStart(2, '0')}</span>
								<span class="step-copy">
									<span class="step-title">{step.post.title}</span>
									{#if step.post.summary}<span class="step-sum">{step.post.summary}</span>{/if}
									<span class="now">Current</span>
								</span>
							</div>
						{:else}
							<a class="step" href="/post/{step.post.slug}">
								<span class="num">{String(step.position).padStart(2, '0')}</span>
								<span class="step-copy">
									<span class="step-title">{step.post.title}</span>
									{#if step.post.summary}<span class="step-sum">{step.post.summary}</span>{/if}
								</span>
							</a>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}

		{#if showPager && (prev || next)}
			<nav class="pager" aria-label="Lesson navigation">
				{#if prev}
					<a class="pager-link prev" href="/post/{prev.post.slug}">
						<span class="pager-label">Previous</span>
						<span class="pager-title">{prev.post.title}</span>
					</a>
				{:else}
					<span class="pager-link prev empty"></span>
				{/if}
				{#if next}
					<a class="pager-link next" href="/post/{next.post.slug}">
						<span class="pager-label">Next</span>
						<span class="pager-title">{next.post.title}</span>
					</a>
				{/if}
			</nav>
		{/if}
	</section>
{/if}

<style>
	.steps {
		margin-bottom: 2.75rem;
		min-width: 0;
	}

	.steps.pager-only {
		margin-bottom: 2rem;
	}

	.steps-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.35rem 1rem;
		margin-bottom: 1.15rem;
	}

	.sec {
		font-family: var(--font-ui);
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--faint);
		margin: 0;
	}

	.guide-link {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--muted);
		text-decoration: none;
		max-width: 100%;
		overflow-wrap: break-word;
	}

	.guide-link:hover {
		color: var(--accent);
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 1px solid var(--line);
	}

	li {
		padding: 0 0 1.35rem 0;
	}

	li:last-child {
		padding-bottom: 0;
	}

	.note {
		padding: 0 0 0.55rem 1.25rem;
	}

	.note :global(.prose) {
		font-size: 1.05rem;
		color: var(--muted);
		font-style: italic;
	}

	.step {
		display: grid;
		grid-template-columns: 2.25rem minmax(0, 1fr);
		gap: 0.75rem;
		padding: 0.25rem 0 0.25rem 1.1rem;
		color: inherit;
		text-decoration: none;
		margin-left: -1px;
		border-left: 2px solid transparent;
	}

	a.step:hover {
		border-left-color: var(--mark);
		text-decoration: none;
		color: inherit;
	}

	a.step:hover .step-title {
		color: var(--accent);
	}

	li.current .step {
		border-left-color: var(--accent);
		background: color-mix(in srgb, var(--accent-soft, transparent) 70%, transparent);
		padding-top: 0.55rem;
		padding-bottom: 0.55rem;
		padding-right: 0.75rem;
		border-radius: 0 var(--radius) var(--radius) 0;
	}

	.num {
		font-family: var(--font-ui);
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--mark);
		line-height: 1.35;
		font-variant-numeric: tabular-nums;
	}

	li.current .num {
		color: var(--accent);
	}

	.step-title {
		display: block;
		font-family: var(--font-read);
		font-weight: 600;
		font-size: 1.1rem;
		color: var(--ink-strong);
		overflow-wrap: break-word;
	}

	.step-sum {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.9rem;
		color: var(--muted);
		font-family: var(--font-read);
	}

	.now {
		display: inline-block;
		margin-top: 0.35rem;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
	}

	.pager-only .pager {
		margin-top: 0;
		padding-top: 0;
		border-top: none;
	}

	.pager-link {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.65rem 0.15rem;
		text-decoration: none;
		color: inherit;
		min-width: 0;
	}

	.pager-link:hover {
		text-decoration: none;
		color: inherit;
	}

	.pager-link:hover .pager-title {
		color: var(--accent);
	}

	.pager-link.next {
		text-align: right;
		justify-self: end;
	}

	.pager-link.empty {
		pointer-events: none;
	}

	.pager-label {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--faint);
	}

	.pager-title {
		font-family: var(--font-read);
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--ink-strong);
		overflow-wrap: break-word;
	}

	@media (max-width: 720px) {
		.step {
			grid-template-columns: 1.75rem minmax(0, 1fr);
			padding-left: 0.85rem;
			gap: 0.55rem;
		}

		.note {
			padding-left: 0.85rem;
		}

		.pager {
			grid-template-columns: 1fr;
		}

		.pager-link.next {
			text-align: left;
			justify-self: stretch;
		}
	}
</style>
