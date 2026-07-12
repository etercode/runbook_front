<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/auth/auth.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	let next = $derived($page.url.searchParams.get('next') ?? '/');

	async function submit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		error = '';
		busy = true;
		try {
			await auth.login(email, password);
			goto(next);
		} catch (err) {
			error =
				/** @type {any} */ (err)?.status === 401
					? 'Invalid email or password.'
					: 'Something went wrong.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Log in — Runbook</title></svelte:head>

<div class="gate">
	<aside class="brand-pane">
		<a href="/" class="logo">Runbook</a>
		<div class="brand-copy">
			<p class="line">Your learning, bound.</p>
			<ul class="beats">
				<li>Notes that stay put</li>
				<li>Guides you can revisit</li>
				<li>A shelf that grows with you</li>
			</ul>
		</div>
	</aside>
	<div class="form-pane">
		<div class="form-box anim-up">
			<h1>Welcome back</h1>
			<p class="muted sub">Log in to like, save, and leave margin notes.</p>
			{#if error}<div class="alert alert-error">{error}</div>{/if}
			<form onsubmit={submit}>
				<div class="field">
					<label for="email">Email</label>
					<input id="email" type="email" bind:value={email} required autocomplete="email" />
				</div>
				<div class="field">
					<label for="password">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						autocomplete="current-password"
					/>
				</div>
				<button class="btn" style="width:100%" disabled={busy}>
					{busy ? 'Logging in…' : 'Log in'}
				</button>
			</form>
			<p class="foot muted">No account? <a href="/register">Join</a></p>
		</div>
	</div>
</div>

<style>
	.gate {
		flex: 1;
		display: grid;
		grid-template-columns: minmax(12rem, 0.42fr) minmax(0, 1fr);
		min-height: 100vh;
		width: 100%;
		margin: 0;
	}

	.brand-pane {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 2rem;
		padding: clamp(1.5rem, 3.5vw, 2.5rem);
		background:
			radial-gradient(ellipse 90% 60% at 10% 0%, color-mix(in srgb, var(--mark) 32%, transparent), transparent 55%),
			radial-gradient(ellipse 70% 50% at 100% 100%, color-mix(in srgb, #fff 12%, transparent), transparent 50%),
			linear-gradient(165deg, color-mix(in srgb, var(--accent) 92%, #000) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 85%, var(--mark)) 100%);
		color: var(--accent-contrast);
	}

	.logo {
		font-family: var(--font-ui);
		font-weight: 700;
		font-size: clamp(1.35rem, 2.8vw, 1.75rem);
		letter-spacing: -0.02em;
		color: inherit;
		text-decoration: none;
		line-height: 1.1;
	}

	.logo:hover {
		color: inherit;
		opacity: 0.9;
		text-decoration: none;
	}

	.brand-copy {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.line {
		margin: 0;
		font-family: var(--font-read);
		font-size: clamp(1.15rem, 2.2vw, 1.45rem);
		font-style: italic;
		opacity: 0.92;
		line-height: 1.35;
		max-width: 11ch;
	}

	.beats {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		font-size: 0.88rem;
		line-height: 1.35;
		opacity: 0.78;
	}

	.beats li {
		padding-left: 0.85rem;
		border-left: 2px solid color-mix(in srgb, var(--accent-contrast) 35%, transparent);
	}

	.form-pane {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(1.5rem, 4vw, 2.5rem);
		background: var(--page);
	}

	.form-box {
		width: 100%;
		max-width: 22rem;
	}

	.form-box h1 {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: 1.65rem;
		letter-spacing: -0.02em;
		margin: 0 0 0.35rem;
	}

	.sub {
		margin: 0 0 1.75rem;
		font-size: 0.95rem;
	}

	.foot {
		margin: 1.5rem 0 0;
		text-align: center;
		font-size: 0.88rem;
	}

	@media (max-width: 800px) {
		.gate {
			grid-template-columns: 1fr;
		}

		.brand-pane {
			min-height: auto;
			padding-bottom: 1.35rem;
			gap: 1rem;
		}

		.line {
			max-width: none;
		}

		.beats {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.5rem 1rem;
		}

		.beats li {
			border-left: none;
			padding-left: 0;
			opacity: 0.85;
		}

		.beats li::before {
			content: '· ';
			opacity: 0.5;
		}
	}
</style>
