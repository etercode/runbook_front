<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';
	import Avatar from '$lib/components/Avatar.svelte';
	import { timeAgo } from '$lib/util/format';

	const PAGE = 30;

	let sessions = $state(/** @type {any[]} */ ([]));
	let total = $state(0);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');
	let activeOnly = $state(true);
	let busyId = $state(/** @type {number | null} */ (null));

	async function load(reset = true) {
		if (reset) {
			loading = true;
			error = '';
		}
		try {
			const res = await api.adminListSessions({
				limit: PAGE,
				offset: reset ? 0 : sessions.length,
				activeOnly
			});
			const items = res.items ?? [];
			sessions = reset ? items : [...sessions, ...items];
			total = res.total ?? sessions.length;
		} catch {
			error = 'Failed to load sessions.';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	onMount(() => load(true));

	function toggleFilter() {
		activeOnly = !activeOnly;
		load(true);
	}

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		await load(false);
	}

	async function revoke(/** @type {any} */ s) {
		if (!confirm(`Revoke session for ${s.user?.name ?? 'user'} (${s.device})?`)) return;
		busyId = s.id;
		try {
			await api.adminRevokeSession(s.id);
			if (activeOnly) {
				sessions = sessions.filter((x) => x.id !== s.id);
				total = Math.max(0, total - 1);
			} else {
				sessions = sessions.map((x) =>
					x.id === s.id ? { ...x, active: false, revoked: true } : x
				);
			}
		} catch {
			error = 'Could not revoke session.';
		} finally {
			busyId = null;
		}
	}

	let canLoadMore = $derived(sessions.length < total);
</script>

<svelte:head><title>Sessions — Studio</title></svelte:head>

<div class="studio-header">
	<div>
		<h2 class="studio-title">Sessions</h2>
		<p class="studio-subtitle">Devices, IPs, and login history ({total})</p>
	</div>
	<button class="btn btn-ghost btn-sm" onclick={toggleFilter}>
		{activeOnly ? 'Show all' : 'Active only'}
	</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

{#if loading}
	<div class="center-state"><span class="spinner"></span></div>
{:else if sessions.length === 0}
	<div class="empty-state">No sessions found.</div>
{:else}
	<div class="studio-table-wrap">
		<table class="studio-table">
			<thead>
				<tr>
					<th>User</th>
					<th>Device</th>
					<th>IP</th>
					<th>Last page</th>
					<th>Seen</th>
					<th>Login</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each sessions as s (s.id)}
					<tr class:dim={!s.active}>
						<td>
							{#if s.user}
								<span class="studio-user-cell">
									<Avatar user={s.user} size={28} />
									<span>
										<strong>{s.user.name}</strong>
										<span class="muted">@{s.user.username}</span>
									</span>
								</span>
							{:else}
								<span class="muted">—</span>
							{/if}
						</td>
						<td>
							<span class="device">{s.device}</span>
							{#if s.revoked}<span class="badge badge-draft">Revoked</span>
							{:else if !s.active}<span class="badge badge-unlisted">Expired</span>{/if}
						</td>
						<td class="mono muted">{s.ipAddress ?? '—'}</td>
						<td class="path muted">{s.path ?? '—'}</td>
						<td class="muted nowrap">{s.lastSeenAt ? timeAgo(s.lastSeenAt) : '—'}</td>
						<td class="muted nowrap">{timeAgo(s.createdAt)}</td>
						<td class="actions">
							{#if s.active && !s.revoked}
								<button
									class="btn btn-danger btn-sm"
									onclick={() => revoke(s)}
									disabled={busyId === s.id}
								>
									Revoke
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if canLoadMore}
		<div class="studio-more">
			<button class="btn btn-ghost" onclick={loadMore} disabled={loadingMore}>
				{loadingMore ? 'Loading…' : 'Load more'}
			</button>
		</div>
	{/if}
{/if}

<style>
	.device {
		display: block;
		font-size: 0.88rem;
		margin-bottom: 0.2rem;
	}

	.mono {
		font-family: var(--font-mono);
		font-size: 0.82rem;
	}

	.path {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		max-width: 14rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dim {
		opacity: 0.65;
	}

	.actions {
		text-align: right;
		white-space: nowrap;
	}
</style>
