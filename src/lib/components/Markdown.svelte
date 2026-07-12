<script>
	import { renderMarkdown } from '$lib/util/markdown';
	import { portal } from '$lib/util/portal';

	/** @type {{ source: string | null | undefined }} */
	let { source } = $props();
	let html = $derived(renderMarkdown(source));

	/** @type {{ src: string, alt: string } | null} */
	let lightbox = $state(null);

	function closeLightbox() {
		lightbox = null;
	}

	function openLightbox(/** @type {HTMLImageElement} */ img) {
		lightbox = { src: img.currentSrc || img.src, alt: img.alt || '' };
	}

	function handleClick(/** @type {MouseEvent} */ e) {
		const t = /** @type {HTMLElement} */ (e.target);

		const btn = t.closest?.('.code-copy');
		if (btn) {
			const code = btn.closest('.code-block')?.querySelector('code');
			if (!code) return;
			navigator.clipboard?.writeText(code.textContent ?? '').then(() => {
				const prev = btn.textContent;
				btn.textContent = 'Copied';
				btn.classList.add('copied');
				setTimeout(() => {
					btn.textContent = prev;
					btn.classList.remove('copied');
				}, 1200);
			});
			return;
		}

		const img = t.closest?.('img');
		if (img && img instanceof HTMLImageElement && !img.closest('.code-block')) {
			e.preventDefault();
			e.stopPropagation();
			openLightbox(img);
		}
	}

	/** Backdrop only — ignore clicks on the image / close button. */
	function onBackdropPointer(/** @type {MouseEvent} */ e) {
		if (e.target === e.currentTarget) closeLightbox();
	}

	/** @param {KeyboardEvent} e */
	function onKey(e) {
		if (e.key === 'Escape' && lightbox) {
			e.preventDefault();
			closeLightbox();
		}
	}

	$effect(() => {
		if (!lightbox || typeof document === 'undefined') return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="prose" onclick={handleClick}>{@html html}</div>

{#if lightbox}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="lb"
		role="dialog"
		aria-modal="true"
		aria-label="Image preview"
		use:portal
		onmousedown={onBackdropPointer}
	>
		<button type="button" class="lb-close" aria-label="Close" onclick={closeLightbox}>×</button>
		<div class="lb-stage">
			<img class="lb-img" src={lightbox.src} alt={lightbox.alt} />
		</div>
	</div>
{/if}

<style>
	.lb {
		position: fixed;
		inset: 0;
		z-index: 10000;
		width: 100vw;
		height: 100vh;
		height: 100dvh;
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		display: grid;
		grid-template: 1fr / 1fr;
		background: rgb(10 14 20 / 0.88);
		cursor: zoom-out;
		animation: lb-in 0.15s ease;
	}

	.lb-stage {
		grid-area: 1 / 1;
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		padding: 2.5rem 1.25rem 1.25rem;
		box-sizing: border-box;
		pointer-events: none;
	}

	.lb-img {
		display: block;
		max-width: min(94vw, 1100px);
		max-height: min(88vh, 88dvh);
		width: auto;
		height: auto;
		object-fit: contain;
		border-radius: 4px;
		box-shadow: 0 20px 56px rgb(0 0 0 / 0.5);
		pointer-events: auto;
		cursor: default;
		margin: 0;
		border: none;
	}

	.lb-close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		z-index: 1;
		width: 2.5rem;
		height: 2.5rem;
		border: none;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.14);
		color: #fff;
		font-size: 1.4rem;
		line-height: 1;
		cursor: pointer;
		pointer-events: auto;
	}

	.lb-close:hover {
		background: rgb(255 255 255 / 0.24);
	}

	@keyframes lb-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
