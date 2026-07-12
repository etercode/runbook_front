<script>
	import '../app.css';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/auth/auth.svelte';
	import { theme } from '$lib/theme/theme.svelte';
	import Shell from '$lib/components/Shell.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';
	import { reportPresence, startPresence, stopPresence } from '$lib/util/presence';

	let { children } = $props();

	let isAuth = $derived($page.url.pathname === '/login' || $page.url.pathname === '/register');
	let pathKey = $derived($page.url.pathname + $page.url.search);

	onMount(() => {
		theme.init();
		auth.init();
	});

	$effect(() => {
		if (auth.isAuthenticated && !isAuth) {
			startPresence(() => pathKey);
		} else {
			stopPresence();
		}
	});

	$effect(() => {
		if (auth.isAuthenticated && !isAuth) {
			reportPresence(pathKey);
		}
	});

	onDestroy(() => stopPresence());
</script>

<svelte:head>
	<title>Runbook</title>
	<meta name="description" content="Your learning, bound — notes and guides that stay." />
</svelte:head>

<NavProgress />
<div class="app" class:app-auth={isAuth}>
	<Shell />
	<main class="app-main">
		{@render children()}
	</main>
</div>

<style>
	.app-auth :global(.app-main) {
		display: flex;
		min-height: 100vh;
		padding-left: 0;
		padding-right: 0;
	}
</style>
