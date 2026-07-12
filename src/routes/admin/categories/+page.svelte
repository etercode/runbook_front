<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';

	let categories = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let busy = $state(false);
	let error = $state('');

	let editingId = $state(/** @type {number | null} */ (null));
	let name = $state('');
	let description = $state('');
	let parentId = $state(/** @type {number | ''} */ (''));

	async function load() {
		try {
			const res = await api.listCategories();
			categories = res.items ?? [];
		} catch {
			error = 'Failed to load categories.';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	let topLevel = $derived(categories.filter((c) => !c.parentId));
	let childrenOf = $derived((/** @type {number} */ id) => categories.filter((c) => c.parentId === id));
	let parentOptions = $derived(topLevel.filter((c) => c.id !== editingId));

	function resetForm() {
		editingId = null;
		name = '';
		description = '';
		parentId = '';
		error = '';
	}

	function startEdit(/** @type {any} */ c) {
		editingId = c.id;
		name = c.name;
		description = c.description ?? '';
		parentId = c.parentId ?? '';
	}

	async function submit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (!name.trim() || busy) return;
		busy = true;
		error = '';
		const trimmedDesc = description.trim() || null;
		const parent = parentId === '' ? null : Number(parentId);
		try {
			if (editingId) {
				await api.updateCategory(editingId, { name: name.trim(), description: trimmedDesc, parentId: parent });
			} else {
				await api.createCategory({
					name: name.trim(),
					description: trimmedDesc ?? undefined,
					parentId: parent ?? undefined
				});
			}
			resetForm();
			await load();
		} catch (err) {
			const s = /** @type {any} */ (err)?.status;
			error =
				s === 409
					? 'A category with that slug already exists.'
					: s === 422
						? 'Invalid parent (would create a loop).'
						: 'Could not save.';
		} finally {
			busy = false;
		}
	}

	async function remove(/** @type {any} */ c) {
		if (!confirm(`Delete "${c.name}"? Its subcategories become top-level; posts keep their other categories.`)) return;
		try {
			await api.deleteCategory(c.id);
			if (editingId === c.id) resetForm();
			await load();
		} catch {
			error = 'Could not delete.';
		}
	}
</script>

<svelte:head><title>Topics — Studio</title></svelte:head>

<div class="studio-header">
	<div>
		<h2 class="studio-title">Topics</h2>
		<p class="studio-subtitle">Organise topics into categories and subcategories.</p>
	</div>
</div>

<div class="studio-cat-layout">
	<section>
		{#if loading}
			<div class="center-state"><span class="spinner"></span></div>
		{:else if categories.length === 0}
			<div class="empty-state">No categories yet.</div>
		{:else}
			<ul class="studio-tree">
				{#each topLevel as cat (cat.id)}
					<li>
						<div class="studio-cat-row" class:editing={editingId === cat.id}>
							<div class="studio-cat-info">
								<strong>{cat.name}</strong>
								<span class="badge">{cat.postCount}</span>
							</div>
							<div class="studio-actions">
								<button class="btn btn-ghost btn-sm" onclick={() => startEdit(cat)}>Edit</button>
								<button class="btn btn-danger btn-sm" onclick={() => remove(cat)}>Delete</button>
							</div>
						</div>
						{#if childrenOf(cat.id).length}
							<ul class="studio-subtree">
								{#each childrenOf(cat.id) as sub (sub.id)}
									<li class="studio-cat-row" class:editing={editingId === sub.id}>
										<div class="studio-cat-info">
											<span class="studio-sub-mark">—</span>
											<strong>{sub.name}</strong>
											<span class="badge">{sub.postCount}</span>
										</div>
										<div class="studio-actions">
											<button class="btn btn-ghost btn-sm" onclick={() => startEdit(sub)}>Edit</button>
											<button class="btn btn-danger btn-sm" onclick={() => remove(sub)}>Delete</button>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<aside>
		<form class="panel panel-pad" onsubmit={submit}>
			<span class="studio-form-title">{editingId ? 'Edit category' : 'New category'}</span>
			{#if error}<div class="alert alert-error">{error}</div>{/if}
			<div class="field">
				<label for="cname">Name</label>
				<input id="cname" bind:value={name} required maxlength="100" placeholder="e.g. PHP" />
			</div>
			<div class="field">
				<label for="cparent">Parent <span class="faint">(optional)</span></label>
				<select id="cparent" bind:value={parentId}>
					<option value="">— None (top-level) —</option>
					{#each parentOptions as p (p.id)}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</div>
			<div class="field">
				<label for="cdesc">Description <span class="faint">(optional)</span></label>
				<textarea id="cdesc" bind:value={description} rows="3"></textarea>
			</div>
			<div class="studio-form-actions">
				<button class="btn" disabled={busy || !name.trim()}>{busy ? 'Saving…' : editingId ? 'Save' : 'Create'}</button>
				{#if editingId}<button type="button" class="btn btn-ghost" onclick={resetForm}>Cancel</button>{/if}
			</div>
		</form>
	</aside>
</div>
