<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';
	import { auth } from '$lib/auth/auth.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import { timeAgo } from '$lib/util/format';

	const PAGE = 30;

	let users = $state(/** @type {any[]} */ ([]));
	let total = $state(0);
	let loading = $state(true);
	let loadingMore = $state(false);
	let busyId = $state(/** @type {number | null} */ (null));
	let error = $state('');

	async function load() {
		loading = true;
		try {
			const res = await api.adminListUsers({ limit: PAGE, offset: 0 });
			users = res.items ?? [];
			total = res.total ?? users.length;
		} catch {
			error = 'Failed to load users.';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		try {
			const res = await api.adminListUsers({ limit: PAGE, offset: users.length });
			users = [...users, ...(res.items ?? [])];
		} finally {
			loadingMore = false;
		}
	}

	async function toggleAdmin(/** @type {any} */ u) {
		busyId = u.id;
		try {
			const updated = await api.setUserAdmin(u.id, !u.admin);
			users = users.map((x) => (x.id === updated.id ? updated : x));
		} catch (err) {
			error =
				/** @type {any} */ (err)?.status === 422
					? "You can't change your own admin status."
					: 'Could not update user.';
		} finally {
			busyId = null;
		}
	}

	async function toggleBan(/** @type {any} */ u) {
		const nextBan = !u.banned;
		if (
			nextBan &&
			!confirm(`Ban ${u.name} (@${u.username})? They will be signed out and cannot log in.`)
		) {
			return;
		}
		busyId = u.id;
		try {
			const updated = nextBan ? await api.banUser(u.id) : await api.unbanUser(u.id);
			users = users.map((x) => (x.id === updated.id ? updated : x));
		} catch (err) {
			error =
				/** @type {any} */ (err)?.status === 422
					? "You can't ban your own account."
					: nextBan
						? 'Could not ban user.'
						: 'Could not unban user.';
		} finally {
			busyId = null;
		}
	}

	async function remove(/** @type {any} */ u) {
		if (!confirm(`Delete ${u.email}? This removes their account.`)) return;
		busyId = u.id;
		try {
			await api.deleteUser(u.id);
			users = users.filter((x) => x.id !== u.id);
			total -= 1;
		} catch (err) {
			error =
				/** @type {any} */ (err)?.status === 422
					? "You can't delete your own account."
					: 'Could not delete user.';
		} finally {
			busyId = null;
		}
	}

	let canLoadMore = $derived(users.length < total);
</script>

<svelte:head><title>People — Studio</title></svelte:head>

<div class="studio-header">
	<div>
		<h2 class="studio-title">People</h2>
		<p class="studio-subtitle">{total} user{total === 1 ? '' : 's'}</p>
	</div>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

{#if loading}
	<div class="center-state"><span class="spinner"></span></div>
{:else}
	<div class="studio-table-wrap">
		<table class="studio-table">
			<thead>
				<tr>
					<th>User</th>
					<th>Email</th>
					<th>Status</th>
					<th>Joined</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each users as u (u.id)}
					<tr class:banned-row={u.banned}>
						<td>
							<span class="studio-user-cell">
								<Avatar user={u} size={28} />
								<span>
									<strong>{u.name}</strong>
									<span class="muted">@{u.username}</span>
								</span>
							</span>
						</td>
						<td class="muted">{u.email}</td>
						<td>
							<span class="tags">
								{#if u.admin}<span class="badge badge-guide">Admin</span>{/if}
								{#if u.banned}<span class="badge badge-draft">Banned</span>
								{:else if !u.admin}<span class="muted">User</span>{/if}
							</span>
						</td>
						<td class="muted nowrap">{timeAgo(u.createdAt)}</td>
						<td>
							<div class="studio-actions">
								{#if u.id === auth.user?.id}
									<span class="faint" style="font-size:0.82rem;">You</span>
								{:else}
									<button
										class="btn btn-ghost btn-sm"
										onclick={() => toggleAdmin(u)}
										disabled={busyId === u.id || u.banned}
									>
										{u.admin ? 'Revoke admin' : 'Make admin'}
									</button>
									<button
										class="btn btn-ghost btn-sm"
										onclick={() => toggleBan(u)}
										disabled={busyId === u.id}
									>
										{u.banned ? 'Unban' : 'Ban'}
									</button>
									<button
										class="btn btn-danger btn-sm"
										onclick={() => remove(u)}
										disabled={busyId === u.id}
									>
										Delete
									</button>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if canLoadMore}
		<div class="studio-more">
			<button class="btn btn-ghost" onclick={loadMore} disabled={loadingMore}
				>{loadingMore ? 'Loading…' : 'Load more'}</button
			>
		</div>
	{/if}
{/if}

<style>
	.banned-row {
		opacity: 0.72;
	}
</style>
