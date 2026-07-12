<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as api from '$lib/api/client';
	import PostForm from '$lib/components/PostForm.svelte';
	import StepsEditor from '$lib/components/StepsEditor.svelte';

	let post = $state(/** @type {any} */ (null));
	let categories = $state(/** @type {any[]} */ ([]));
	let loading = $state(true);
	let error = $state('');
	let busy = $state(false);
	let msg = $state('');

	let id = $derived(Number($page.params.id));

	onMount(async () => {
		try {
			const [p, cats] = await Promise.all([api.adminGetPost(id), api.listCategories()]);
			post = p;
			categories = cats.items ?? [];
		} catch {
			error = 'Failed to load the post.';
		} finally {
			loading = false;
		}
	});

	async function save(/** @type {any} */ data) {
		busy = true;
		msg = '';
		error = '';
		try {
			const updated = await api.updatePost(id, data);
			post = updated;
			msg = 'Saved.';
		} catch {
			error = 'Could not save.';
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!confirm('Delete this post? This hides it everywhere.')) return;
		try {
			await api.deletePost(id);
			goto('/admin');
		} catch {
			error = 'Could not delete.';
		}
	}
</script>

<svelte:head><title>{post ? `Edit: ${post.title}` : 'Edit post'} — Studio</title></svelte:head>

<a href="/admin/posts" class="studio-back">All posts</a>

{#if loading}
	<div class="center-state"><span class="spinner"></span></div>
{:else if error && !post}
	<div class="alert alert-error">{error}</div>
{:else if post}
	<div class="studio-edit-head">
		<h2 class="studio-edit-title">Edit post</h2>
		<div class="studio-edit-actions">
			<a class="btn btn-ghost btn-sm" href="/post/{post.slug}" target="_blank">View</a>
			<button class="btn btn-danger btn-sm" onclick={remove}>Delete</button>
		</div>
	</div>

	{#if error}<div class="alert alert-error">{error}</div>{/if}
	{#if msg}<div class="alert alert-ok">{msg}</div>{/if}

	{#key post.id}
		<PostForm initial={post} {categories} submitLabel="Save changes" {busy} onsubmit={save} />
		<StepsEditor postId={post.id} initialSteps={post.steps ?? []} />
	{/key}
{/if}
