<script>
	import { navigating } from '$app/stores';
</script>

{#if $navigating}
	<div class="nav-progress" aria-hidden="true"><span class="nav-progress-bar"></span></div>
{/if}

<style>
	.nav-progress {
		position: fixed;
		inset: 0 0 auto 0;
		height: 2px;
		z-index: 9999;
		background: var(--accent-soft);
		overflow: hidden;
	}
	.nav-progress-bar {
		display: block;
		height: 100%;
		width: 35%;
		background: var(--accent);
		animation: slide 0.85s ease-in-out infinite;
	}
	@keyframes slide {
		0% {
			transform: translateX(-120%);
		}
		100% {
			transform: translateX(340%);
		}
	}
</style>
