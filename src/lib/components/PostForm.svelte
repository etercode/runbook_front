<script>
	import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';

	/**
	 * @type {{
	 *   initial?: any,
	 *   categories: any[],
	 *   submitLabel: string,
	 *   busy?: boolean,
	 *   onsubmit: (data: { title: string, summary: string|null, body: string|null, published: boolean, categoryIds: number[] }) => void
	 * }}
	 */
	let { initial = null, categories, submitLabel, busy = false, onsubmit } = $props();

	let title = $state(initial?.title ?? '');
	let summary = $state(initial?.summary ?? '');
	let body = $state(initial?.body ?? '');
	let published = $state(initial?.published ?? true);
	let listed = $state(initial?.listed ?? true);
	let selected = $state(new Set((initial?.categories ?? []).map((/** @type {any} */ c) => c.id)));

	function toggle(/** @type {number} */ id) {
		const next = new Set(selected);
		next.has(id) ? next.delete(id) : next.add(id);
		selected = next;
	}

	function submit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		onsubmit({
			title: title.trim(),
			summary: summary.trim() || null,
			body: body.trim() || null,
			published,
			listed,
			categoryIds: [...selected]
		});
	}
</script>

<form onsubmit={submit} class="panel panel-pad">
	<div class="field">
		<label for="title">Title</label>
		<input id="title" bind:value={title} required maxlength="200" placeholder="How to…" />
	</div>
	<div class="field">
		<label for="summary">Summary <span class="faint">(optional)</span></label>
		<input id="summary" bind:value={summary} maxlength="2000" placeholder="One line shown in listings" />
	</div>
	<div class="field">
		<label for="body">Body <span class="faint">(Markdown — optional for guides)</span></label>
		<MarkdownEditor id="body" bind:value={body} rows={14} placeholder="Write the note, or an intro then add steps…" />
	</div>

	{#if categories.length}
		<div class="field">
			<span class="field-label">Categories</span>
			<div class="pf-tags">
				{#each categories as cat (cat.id)}
					<button
						type="button"
						class="tag"
						class:tag-active={selected.has(cat.id)}
						onclick={() => toggle(cat.id)}
					>
						{cat.name}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="pf-toggles">
		<label class="checkbox">
			<input type="checkbox" bind:checked={published} />
			Published <span class="faint">(visible to everyone)</span>
		</label>
		<label class="checkbox">
			<input type="checkbox" bind:checked={listed} />
			Show in the main feed
			<span class="faint">— off = only reachable by link or inside a guide</span>
		</label>
	</div>

	<div class="pf-foot">
		<button class="btn" disabled={busy || !title.trim()}>{busy ? 'Saving…' : submitLabel}</button>
	</div>
</form>

<style>
	.pf-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.pf-toggles {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin: 0.75rem 0 1.25rem;
	}
	.pf-foot {
		display: flex;
		justify-content: flex-end;
	}
</style>
