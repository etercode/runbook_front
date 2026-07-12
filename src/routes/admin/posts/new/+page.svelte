<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as api from '$lib/api/client';
	import PostForm from '$lib/components/PostForm.svelte';

	let categories = $state(/** @type {any[]} */ ([]));
	let busy = $state(false);
	let error = $state('');

	onMount(async () => {
		try {
			const res = await api.listCategories();
			categories = res.items ?? [];
		} catch {
			/* ignore */
		}
	});

	async function create(/** @type {any} */ data) {
		busy = true;
		error = '';
		try {
			const post = await api.createPost(data);
			goto(`/admin/posts/${post.id}`);
		} catch (e) {
			error = 'Could not create the post.';
			busy = false;
		}
	}
</script>

<svelte:head><title>New post — Studio</title></svelte:head>

<a href="/admin/posts" class="studio-back">All posts</a>
<h2 class="studio-edit-title" style="margin: 0.5rem 0 1rem;">New post</h2>
{#if error}<div class="alert alert-error">{error}</div>{/if}

<PostForm {categories} submitLabel="Create post" {busy} onsubmit={create} />
