<script>
	import '$lib/styles/studio.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/auth/auth.svelte';

	let { children } = $props();
	let checked = $state(false);
	let denied = $state(false);

	onMount(async () => {
		await auth.init();
		if (!auth.isAuthenticated) {
			goto('/login?next=/admin');
			return;
		}
		if (!auth.user) await auth.fetchUser();
		if (!auth.isAdmin) {
			denied = true;
			return;
		}
		checked = true;
	});

	let path = $derived($page.url.pathname);
	const nav = [
		{ href: '/admin', label: 'Overview', match: (/** @type {string} */ p) => p === '/admin' },
		{ href: '/admin/posts', label: 'Notes', match: (/** @type {string} */ p) => p.startsWith('/admin/posts') },
		{ href: '/admin/categories', label: 'Topics', match: (/** @type {string} */ p) => p.startsWith('/admin/categories') },
		{ href: '/admin/comments', label: 'Comments', match: (/** @type {string} */ p) => p.startsWith('/admin/comments') },
		{ href: '/admin/users', label: 'People', match: (/** @type {string} */ p) => p.startsWith('/admin/users') },
		{ href: '/admin/sessions', label: 'Sessions', match: (/** @type {string} */ p) => p.startsWith('/admin/sessions') },
		{ href: '/admin/live', label: 'Live', match: (/** @type {string} */ p) => p === '/admin/live' }
	];
</script>

{#if denied}
	<div class="measure" style="padding-top: 4rem;">
		<div class="alert alert-error">You do not have permission to access the admin area.</div>
		<a href="/" class="btn btn-ghost btn-sm">Back to site</a>
	</div>
{:else if checked}
	<div class="studio rise">
		<header class="adm-top">
			<h1 class="adm-brand">Studio</h1>
			<a href="/" class="btn btn-ghost btn-sm">Back to site</a>
		</header>
		<nav class="studio-tabs">
			{#each nav as item (item.href)}
				<a href={item.href} class="studio-tab" class:active={item.match(path)}>
					{item.label}
				</a>
			{/each}
		</nav>
		{@render children()}
	</div>
{:else}
	<div class="center-state"><span class="spinner"></span></div>
{/if}

<style>
	.adm-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.adm-brand {
		font-family: var(--font-display);
		font-size: 1.85rem;
		margin: 0;
		color: var(--ink-strong);
	}
</style>
