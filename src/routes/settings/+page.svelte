<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as api from '$lib/api/client';
	import { auth } from '$lib/auth/auth.svelte';
	import { theme } from '$lib/theme/theme.svelte';
	import { timeAgo } from '$lib/util/format';

	let ready = $state(false);

	let name = $state('');
	let username = $state('');
	let profileMsg = $state('');
	let profileErr = $state('');
	let savingProfile = $state(false);

	let currentPassword = $state('');
	let newPassword = $state('');
	let pwMsg = $state('');
	let pwErr = $state('');
	let savingPw = $state(false);

	let sessions = $state(/** @type {any[]} */ ([]));
	let sessionsLoading = $state(false);
	let sessionsErr = $state('');
	let sessionsMsg = $state('');
	let busySessionId = $state(/** @type {number | null} */ (null));
	let revokingOthers = $state(false);

	async function loadSessions() {
		sessionsLoading = true;
		sessionsErr = '';
		try {
			const res = await api.listMySessions();
			sessions = res.items ?? [];
		} catch {
			sessionsErr = 'Could not load sessions.';
		} finally {
			sessionsLoading = false;
		}
	}

	onMount(async () => {
		await auth.init();
		if (!auth.isAuthenticated) {
			goto('/login?next=/settings');
			return;
		}
		if (!auth.user) await auth.fetchUser();
		name = auth.user?.name ?? '';
		username = auth.user?.username ?? '';
		ready = true;
		loadSessions();
	});

	async function saveProfile(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		profileMsg = '';
		profileErr = '';
		savingProfile = true;
		try {
			const user = await api.updateProfile({ name, username });
			auth.user = user;
			profileMsg = 'Profile updated.';
		} catch (err) {
			profileErr =
				/** @type {any} */ (err)?.status === 409 ? 'Username already used.' : 'Could not save.';
		} finally {
			savingProfile = false;
		}
	}

	async function savePassword(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		pwMsg = '';
		pwErr = '';
		savingPw = true;
		try {
			await api.changePassword({ currentPassword, newPassword });
			pwMsg = 'Password changed. Other sessions were signed out.';
			currentPassword = '';
			newPassword = '';
			await loadSessions();
		} catch (err) {
			pwErr =
				/** @type {any} */ (err)?.status === 422
					? 'Current password is wrong, or the new one is too short.'
					: 'Could not change password.';
		} finally {
			savingPw = false;
		}
	}

	async function revokeSession(/** @type {any} */ s) {
		const label = s.current ? 'this device (you will be signed out)' : s.device;
		if (!confirm(`Revoke session: ${label}?`)) return;
		busySessionId = s.id;
		sessionsErr = '';
		sessionsMsg = '';
		try {
			const res = await api.revokeMySession(s.id);
			if (res?.current || s.current) {
				await auth.logout();
				goto('/login');
				return;
			}
			sessions = sessions.filter((x) => x.id !== s.id);
			sessionsMsg = 'Session revoked.';
		} catch {
			sessionsErr = 'Could not revoke session.';
		} finally {
			busySessionId = null;
		}
	}

	async function revokeOthers() {
		if (!confirm('Sign out all other devices? This device stays signed in.')) return;
		revokingOthers = true;
		sessionsErr = '';
		sessionsMsg = '';
		try {
			const res = await api.revokeOtherSessions();
			await loadSessions();
			sessionsMsg =
				(res?.revoked ?? 0) > 0
					? `Signed out ${res.revoked} other session${res.revoked === 1 ? '' : 's'}.`
					: 'No other sessions to revoke.';
		} catch {
			sessionsErr = 'Could not revoke other sessions.';
		} finally {
			revokingOthers = false;
		}
	}

	let otherSessions = $derived(sessions.filter((s) => !s.current));

	const themeOptions = /** @type {const} */ ([
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' },
		{ id: 'system', label: 'System' }
	]);
</script>

<svelte:head><title>Settings — Runbook</title></svelte:head>

<div class="measure rise">
	<h1 class="st-title">Settings</h1>

	<section class="panel panel-pad st-section">
		<h2 class="st-heading">Appearance</h2>
		<p class="muted st-desc">
			A soft, low-contrast dark theme for comfortable reading. "System" follows your device.
		</p>
		<div class="st-theme-grid">
			{#each themeOptions as opt (opt.id)}
				<button
					class="st-theme-opt"
					class:active={theme.choice === opt.id}
					onclick={() => theme.set(opt.id)}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</section>

	{#if ready}
		<section class="panel panel-pad st-section">
			<h2 class="st-heading">Profile</h2>
			{#if profileErr}<div class="alert alert-error">{profileErr}</div>{/if}
			{#if profileMsg}<div class="alert alert-ok">{profileMsg}</div>{/if}
			<form onsubmit={saveProfile}>
				<div class="field">
					<label for="name">Name</label>
					<input id="name" bind:value={name} required maxlength="100" />
				</div>
				<div class="field">
					<label for="username">Username</label>
					<input id="username" bind:value={username} required minlength="3" maxlength="180" />
				</div>
				<button class="btn" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
			</form>
		</section>

		<section class="panel panel-pad st-section">
			<h2 class="st-heading">Password</h2>
			{#if pwErr}<div class="alert alert-error">{pwErr}</div>{/if}
			{#if pwMsg}<div class="alert alert-ok">{pwMsg}</div>{/if}
			<form onsubmit={savePassword}>
				<div class="field">
					<label for="current">Current password</label>
					<input id="current" type="password" bind:value={currentPassword} required autocomplete="current-password" />
				</div>
				<div class="field">
					<label for="new">New password</label>
					<input id="new" type="password" bind:value={newPassword} required minlength="8" autocomplete="new-password" />
				</div>
				<button class="btn" disabled={savingPw}>{savingPw ? 'Saving…' : 'Change password'}</button>
			</form>
		</section>

		<section class="panel panel-pad st-section">
			<div class="st-sessions-head">
				<div>
					<h2 class="st-heading">Sessions</h2>
					<p class="muted st-desc">Devices signed into your account. Revoke any you don’t recognize.</p>
				</div>
				{#if otherSessions.length > 0}
					<button class="btn btn-ghost btn-sm" onclick={revokeOthers} disabled={revokingOthers}>
						{revokingOthers ? 'Signing out…' : 'Sign out others'}
					</button>
				{/if}
			</div>
			{#if sessionsErr}<div class="alert alert-error">{sessionsErr}</div>{/if}
			{#if sessionsMsg}<div class="alert alert-ok">{sessionsMsg}</div>{/if}
			{#if sessionsLoading}
				<div class="center-state"><span class="spinner"></span></div>
			{:else if sessions.length === 0}
				<p class="muted">No active sessions.</p>
			{:else}
				<ul class="st-session-list">
					{#each sessions as s (s.id)}
						<li class="st-session" class:current={s.current}>
							<div class="st-session-main">
								<strong class="st-session-device">
									{s.device}
									{#if s.current}<span class="st-session-badge">This device</span>{/if}
								</strong>
								<span class="muted st-session-meta">
									{s.ipAddress ?? 'Unknown IP'}
									· signed in {timeAgo(s.createdAt)}
									{#if s.lastSeenAt}
										· active {timeAgo(s.lastSeenAt)}
									{/if}
								</span>
							</div>
							<button
								class="btn btn-danger btn-sm"
								onclick={() => revokeSession(s)}
								disabled={busySessionId === s.id}
							>
								{busySessionId === s.id ? '…' : s.current ? 'Sign out' : 'Revoke'}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.st-title {
		font-family: var(--font-display);
		font-size: 2.2rem;
		margin: 0 0 1.75rem;
	}
	.st-section {
		margin-bottom: 1.25rem;
	}
	.st-heading {
		font-family: var(--font-display);
		font-size: 1.25rem;
		margin: 0 0 0.25rem;
	}
	.st-desc {
		margin: 0 0 1rem;
		font-size: 0.88rem;
	}
	.st-theme-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		max-width: 26rem;
	}
	.st-theme-opt {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.85rem 1rem;
		border: 2px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font-size: 0.88rem;
		font-weight: 600;
		font-family: var(--font-ui);
	}
	.st-theme-opt:hover {
		border-color: var(--line-strong);
	}
	.st-theme-opt.active {
		border-color: var(--accent);
		background: var(--accent-soft);
		color: var(--accent);
	}
	.st-sessions-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.25rem;
	}
	.st-sessions-head .st-desc {
		margin-bottom: 0;
	}
	.st-session-list {
		list-style: none;
		margin: 1rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.st-session {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 0;
		border-top: 1px solid var(--line);
	}
	.st-session:first-child {
		border-top: none;
		padding-top: 0;
	}
	.st-session-main {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}
	.st-session-device {
		font-size: 0.92rem;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.45rem;
	}
	.st-session-badge {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--accent);
		background: var(--accent-soft);
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
	}
	.st-session-meta {
		font-size: 0.82rem;
	}
</style>
