<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';
	import { auth } from '$lib/auth/auth.svelte';

	let stats = $state(/** @type {any} */ (null));
	let loading = $state(true);

	onMount(async () => {
		try {
			stats = await api.adminStats();
		} catch {
			/* ignore */
		} finally {
			loading = false;
		}
	});

	const tiles = [
		{ key: 'posts', label: 'Posts' },
		{ key: 'guides', label: 'Guides' },
		{ key: 'categories', label: 'Topics' },
		{ key: 'users', label: 'Users' },
		{ key: 'comments', label: 'Comments' }
	];
</script>

<svelte:head><title>Studio — Runbook</title></svelte:head>

<div class="studio-header">
	<div>
		<h2 class="studio-title">Welcome back, {auth.user?.name}</h2>
		<p class="studio-subtitle">Manage your knowledge base.</p>
	</div>
	<a href="/admin/posts/new" class="btn">New post</a>
</div>

{#if loading}
	<div class="center-state"><span class="spinner"></span></div>
{:else if stats}
	<div class="studio-stats">
		{#each tiles as t (t.key)}
			<div class="studio-stat">
				<span class="studio-stat-value">{stats[t.key] ?? 0}</span>
				<span class="studio-stat-label">{t.label}</span>
			</div>
		{/each}
	</div>

	<div class="studio-quick">
		<a href="/admin/posts" class="studio-quick-item">
			Posts
			<span>Write, edit, group into guides, upload images.</span>
		</a>
		<a href="/admin/categories" class="studio-quick-item">
			Topics
			<span>Organise topics and subcategories.</span>
		</a>
		<a href="/admin/comments" class="studio-quick-item">
			Comments
			<span>Search, edit, or remove discussion notes.</span>
		</a>
		<a href="/admin/users" class="studio-quick-item">
			People
			<span>Grant admin, ban accounts, or remove users.</span>
		</a>
		<a href="/admin/sessions" class="studio-quick-item">
			Sessions
			<span>Devices, IPs, and login history — revoke if needed.</span>
		</a>
		<a href="/admin/live" class="studio-quick-item">
			Live
			<span>Who is online and which page they are on.</span>
		</a>
	</div>
{/if}
