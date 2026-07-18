<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as api from '$lib/api/client';
	import { auth } from '$lib/auth/auth.svelte';
	import { linkify } from '$lib/util/linkify';

	/** @typedef {{ id: number, name: string, description?: string|null, status: 'open'|'done', createdAt?: string, updatedAt?: string }} Todo */

	const PAGE = 20;

	let todos = $state(/** @type {Todo[]} */ ([]));
	let total = $state(0);
	let openCount = $state(0);
	let doneCount = $state(0);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');
	let filter = $state(/** @type {'all' | 'open' | 'done'} */ ('open'));
	let busyId = $state(/** @type {number | null} */ (null));

	let newName = $state('');
	let newDesc = $state('');
	let showDesc = $state(false);
	let creating = $state(false);

	/** @type {number | null} */
	let editingId = $state(null);
	let editName = $state('');
	let editDesc = $state('');

	let allCount = $derived(openCount + doneCount);
	let canLoadMore = $derived(todos.length < total);

	/** @type {number | null} */
	let helpId = $state(null);
	let helpPrompt = $state('');
	let helpBusy = $state(false);
	/** @type {{ title: string, slug: string } | null} */
	let helpResult = $state(null);

	onMount(async () => {
		await auth.init();
		if (!auth.isAuthenticated) {
			goto('/login?next=/todos');
			return;
		}
		if (!auth.user) await auth.fetchUser();
		await load(true);
	});

	/** @param {boolean} [reset] */
	async function load(reset = true) {
		if (reset) {
			loading = true;
			error = '';
		}
		try {
			const res = await api.listTodos({
				limit: PAGE,
				offset: reset ? 0 : todos.length,
				status: filter === 'all' ? undefined : filter
			});
			const items = res.items ?? [];
			todos = reset ? items : [...todos, ...items];
			total = res.total ?? todos.length;
			openCount = res.openCount ?? 0;
			doneCount = res.doneCount ?? 0;
		} catch {
			error = 'Failed to load your todos.';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	/** @param {'all' | 'open' | 'done'} next */
	function setFilter(next) {
		if (filter === next) return;
		filter = next;
		cancelEdit();
		cancelHelp();
		load(true);
	}

	async function loadMore() {
		if (loadingMore || !canLoadMore) return;
		loadingMore = true;
		await load(false);
	}

	async function create() {
		const name = newName.trim();
		if (!name || creating) return;
		creating = true;
		error = '';
		try {
			const todo = await api.createTodo({
				name,
				description: newDesc.trim() || null
			});
			openCount += 1;
			total += filter === 'done' ? 0 : 1;
			if (filter !== 'done') {
				todos = [todo, ...todos];
			}
			newName = '';
			newDesc = '';
			showDesc = false;
		} catch {
			error = 'Could not create todo.';
		} finally {
			creating = false;
		}
	}

	/** @param {Todo} todo */
	async function toggleStatus(todo) {
		if (busyId != null) return;
		busyId = todo.id;
		error = '';
		const next = todo.status === 'open' ? 'done' : 'open';
		try {
			const updated = await api.updateTodo(todo.id, { status: next });
			if (todo.status === 'open') {
				openCount = Math.max(0, openCount - 1);
				doneCount += 1;
			} else {
				doneCount = Math.max(0, doneCount - 1);
				openCount += 1;
			}
			if (filter !== 'all' && filter !== updated.status) {
				todos = todos.filter((t) => t.id !== updated.id);
				total = Math.max(0, total - 1);
			} else {
				todos = todos.map((t) => (t.id === updated.id ? updated : t));
			}
		} catch {
			error = 'Could not update status.';
		} finally {
			busyId = null;
		}
	}

	/** @param {Todo} todo */
	function startEdit(todo) {
		editingId = todo.id;
		editName = todo.name;
		editDesc = todo.description ?? '';
		cancelHelp();
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
		editDesc = '';
	}

	/** @param {Todo} todo */
	function openHelp(todo) {
		helpId = todo.id;
		helpPrompt = '';
		helpResult = null;
		cancelEdit();
	}

	function cancelHelp() {
		helpId = null;
		helpPrompt = '';
		helpBusy = false;
		helpResult = null;
	}

	/** @param {Todo} todo */
	async function runHelp(todo) {
		const prompt = helpPrompt.trim();
		if (!prompt || helpBusy) return;
		helpBusy = true;
		helpResult = null;
		error = '';
		try {
			const res = await api.adminAskTodoHelp(todo.id, { prompt });
			helpPrompt = '';
			if (res.post?.slug) {
				helpResult = { title: res.post.title, slug: res.post.slug };
			}
		} catch (err) {
			const apiErr = /** @type {any} */ (err);
			error =
				apiErr?.message === 'Request timed out'
					? 'Ask help timed out — the model took too long. Try again or shorten the instruction.'
					: apiErr?.body?.message || 'Ask help failed. Check AI providers in Studio.';
		} finally {
			helpBusy = false;
		}
	}

	/** @param {Todo} todo */
	async function saveEdit(todo) {
		const name = editName.trim();
		if (!name || busyId != null) return;
		busyId = todo.id;
		error = '';
		try {
			const updated = await api.updateTodo(todo.id, {
				name,
				description: editDesc.trim() || null
			});
			todos = todos.map((t) => (t.id === updated.id ? updated : t));
			cancelEdit();
		} catch {
			error = 'Could not save todo.';
		} finally {
			busyId = null;
		}
	}

	/** @param {Todo} todo */
	async function remove(todo) {
		if (!confirm('Delete this todo?')) return;
		if (busyId != null) return;
		busyId = todo.id;
		error = '';
		try {
			await api.deleteTodo(todo.id);
			todos = todos.filter((t) => t.id !== todo.id);
			total = Math.max(0, total - 1);
			if (todo.status === 'open') openCount = Math.max(0, openCount - 1);
			else doneCount = Math.max(0, doneCount - 1);
			if (editingId === todo.id) cancelEdit();
			if (helpId === todo.id) cancelHelp();
		} catch {
			error = 'Could not delete todo.';
		} finally {
			busyId = null;
		}
	}

	/** @param {KeyboardEvent} e */
	function onCreateKey(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			create();
		}
	}
</script>

<svelte:head><title>Todos — Runbook</title></svelte:head>

<div class="frame page">
	<header class="head anim-up">
		<p class="kicker">Personal</p>
		<h1>Todos</h1>
		<p class="sub muted">Capture what to do next — mark done when it’s finished.</p>
	</header>

	<form class="composer anim-up" onsubmit={(e) => { e.preventDefault(); create(); }}>
		<div class="composer-row">
			<input
				id="todo-name"
				class="composer-input"
				type="text"
				bind:value={newName}
				placeholder="Add a todo…"
				maxlength="200"
				disabled={creating}
				onkeydown={onCreateKey}
				aria-label="Todo name"
			/>
			<button type="submit" class="btn" disabled={creating || !newName.trim()}>
				{creating ? 'Adding…' : 'Add'}
			</button>
		</div>
		{#if showDesc || newDesc}
			<textarea
				id="todo-desc"
				class="composer-notes"
				bind:value={newDesc}
				placeholder="Optional notes or a URL…"
				rows="2"
				maxlength="5000"
				disabled={creating}
			></textarea>
		{:else}
			<button type="button" class="composer-more" onclick={() => (showDesc = true)}>
				+ Add notes
			</button>
		{/if}
	</form>

	{#if error}
		<div class="alert alert-error">{error}</div>
	{/if}

	{#if loading}
		<div class="center-state"><span class="spinner"></span></div>
	{:else}
		<section class="board anim-up-2">
			<nav class="filters" aria-label="Filter todos">
				<button type="button" class="tab" class:on={filter === 'open'} onclick={() => setFilter('open')}>
					Open <span>{openCount}</span>
				</button>
				<span class="sep" aria-hidden="true">·</span>
				<button type="button" class="tab" class:on={filter === 'done'} onclick={() => setFilter('done')}>
					Done <span>{doneCount}</span>
				</button>
				<span class="sep" aria-hidden="true">·</span>
				<button type="button" class="tab" class:on={filter === 'all'} onclick={() => setFilter('all')}>
					All <span>{allCount}</span>
				</button>
			</nav>

			{#if todos.length === 0}
				<div class="empty">
					<p class="empty-title">
						{#if filter === 'all'}
							No todos yet
						{:else if filter === 'open'}
							Nothing open
						{:else}
							Nothing done yet
						{/if}
					</p>
					<p class="empty-sub muted">
						{#if filter === 'all'}
							Add one above — it’ll land here.
						{:else if filter === 'open'}
							You’re clear for now.
						{:else}
							Completed todos show up here.
						{/if}
					</p>
				</div>
			{:else}
				<ul class="list">
					{#each todos as todo (todo.id)}
						<li class="item" class:done={todo.status === 'done'} class:helping={helpId === todo.id}>
							{#if editingId === todo.id}
								<div class="panel">
									<input
										class="panel-input"
										type="text"
										bind:value={editName}
										maxlength="200"
										aria-label="Edit name"
									/>
									<textarea
										class="panel-notes"
										bind:value={editDesc}
										rows="2"
										maxlength="5000"
										placeholder="Notes…"
										aria-label="Edit description"
									></textarea>
									<div class="panel-actions">
										<button
											type="button"
											class="btn btn-sm"
											disabled={busyId === todo.id || !editName.trim()}
											onclick={() => saveEdit(todo)}
										>
											Save
										</button>
										<button type="button" class="btn btn-ghost btn-sm" onclick={cancelEdit}>Cancel</button>
									</div>
								</div>
							{:else}
								<button
									type="button"
									class="check"
									aria-label={todo.status === 'open' ? 'Mark done' : 'Reopen'}
									aria-pressed={todo.status === 'done'}
									disabled={busyId === todo.id}
									onclick={() => toggleStatus(todo)}
								>
									<span class="box" aria-hidden="true">
										{#if todo.status === 'done'}
											<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
												<path
													d="M2 6.2L4.8 9L10 3"
													stroke="currentColor"
													stroke-width="1.8"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
											</svg>
										{/if}
									</span>
								</button>

								<div class="main">
									<p class="name">{@html linkify(todo.name)}</p>
									{#if todo.description}
										<p class="desc">{@html linkify(todo.description)}</p>
									{/if}

									<div class="toolbar">
										{#if auth.isAdmin}
											<button
												type="button"
												class="tool"
												class:on={helpId === todo.id}
												disabled={busyId === todo.id || helpBusy}
												onclick={() => (helpId === todo.id ? cancelHelp() : openHelp(todo))}
											>
												Ask help
											</button>
										{/if}
										<button type="button" class="tool" disabled={busyId === todo.id} onclick={() => startEdit(todo)}>
											Edit
										</button>
										<button
											type="button"
											class="tool danger"
											disabled={busyId === todo.id}
											onclick={() => remove(todo)}
										>
											Delete
										</button>
									</div>

									{#if helpId === todo.id}
										<div class="panel help">
											<label class="panel-label" for="help-{todo.id}">What should AI do?</label>
											<textarea
												id="help-{todo.id}"
												class="panel-notes"
												bind:value={helpPrompt}
												rows="3"
												maxlength="4000"
												placeholder="Read this todo and create a post — or use the URL and write Markdown…"
												disabled={helpBusy}
											></textarea>
											<div class="panel-actions">
												<button
													type="button"
													class="btn btn-sm"
													disabled={helpBusy || !helpPrompt.trim()}
													onclick={() => runHelp(todo)}
												>
													{helpBusy ? 'Working…' : 'Run'}
												</button>
												<button type="button" class="btn btn-ghost btn-sm" disabled={helpBusy} onclick={cancelHelp}>
													Cancel
												</button>
											</div>
											{#if helpResult}
												<p class="help-ok">
													Created “{helpResult.title}” —
													<a href="/post/{helpResult.slug}">open post</a>
												</p>
											{/if}
										</div>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>

				{#if canLoadMore}
					<div class="more">
						<button type="button" class="btn btn-ghost" onclick={loadMore} disabled={loadingMore}>
							{loadingMore ? 'Loading…' : 'Load more'}
						</button>
					</div>
				{/if}
			{/if}
		</section>
	{/if}
</div>

<style>
	.page {
		padding: 2.5rem 0 4.5rem;
		max-width: 52rem;
	}

	.head {
		margin-bottom: 1.75rem;
	}

	.kicker {
		margin: 0 0 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--mark);
	}

	.head h1 {
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: clamp(1.75rem, 3.5vw, 2.25rem);
		letter-spacing: -0.02em;
		margin: 0 0 0.5rem;
		line-height: 1.2;
		color: var(--ink-strong);
	}

	.sub {
		margin: 0;
		font-family: var(--font-read);
		font-size: 1.1rem;
	}

	/* ---- Composer ---------------------------------------------------- */
	.composer {
		margin-bottom: 1.5rem;
		padding: 1rem 1.25rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		background: var(--sheet);
		box-shadow: var(--shadow-sheet);
		display: grid;
		gap: 0.65rem;
	}

	.composer-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.55rem;
		align-items: center;
	}

	.composer-input,
	.composer-notes,
	.panel-input,
	.panel-notes {
		width: 100%;
		margin: 0;
		font: inherit;
		color: var(--ink);
		background: var(--page);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 0.65rem 0.8rem;
	}

	.composer-input {
		font-family: var(--font-read);
		font-size: 1.05rem;
		font-weight: 500;
		border-color: transparent;
		background: transparent;
		padding-left: 0.15rem;
	}

	.composer-input:focus {
		outline: none;
	}

	.composer-input::placeholder {
		color: var(--faint);
		font-weight: 400;
	}

	.composer-notes,
	.panel-notes {
		resize: vertical;
		font-family: var(--font-read);
		font-size: 0.95rem;
		line-height: 1.45;
		min-height: 3.2rem;
	}

	.composer-input:focus-visible,
	.composer-notes:focus-visible,
	.panel-input:focus-visible,
	.panel-notes:focus-visible {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}

	.composer-more {
		justify-self: start;
		border: none;
		background: none;
		padding: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--faint);
		cursor: pointer;
	}

	.composer-more:hover {
		color: var(--accent);
	}

	/* ---- Board (sheet) ----------------------------------------------- */
	.board {
		background: var(--sheet);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sheet);
		padding: 1.15rem 1.35rem 1.35rem;
		min-height: 18rem;
	}

	/* ---- Filters (like home topics) ---------------------------------- */
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.2rem;
		margin: 0 0 0.35rem;
		padding: 0 0.15rem 0.95rem;
		border-bottom: 1px solid var(--line);
	}

	.tab {
		border: none;
		background: none;
		padding: 0.15rem 0.2rem;
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--muted);
		cursor: pointer;
	}

	.tab span {
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		opacity: 0.65;
		margin-left: 0.2rem;
	}

	.tab:hover {
		color: var(--ink);
	}

	.tab.on {
		color: var(--accent);
	}

	.sep {
		color: var(--faint);
		user-select: none;
	}

	.empty {
		display: grid;
		place-content: center;
		text-align: center;
		gap: 0.35rem;
		min-height: 12rem;
		padding: 2.5rem 1rem;
	}

	.empty-title {
		margin: 0;
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: 1.15rem;
		color: var(--ink-strong);
	}

	.empty-sub {
		margin: 0;
		font-family: var(--font-read);
		font-size: 1.02rem;
	}

	/* ---- List -------------------------------------------------------- */
	.list {
		list-style: none;
		margin: 0;
		padding: 0.15rem 0.15rem 0;
	}

	.item {
		display: grid;
		grid-template-columns: 1.75rem minmax(0, 1fr);
		gap: 0.85rem;
		align-items: start;
		padding: 1.05rem 0.35rem;
		margin: 0 -0.35rem;
		border-radius: var(--radius);
		border-bottom: 1px solid var(--line-soft);
		transition: background 0.15s ease, opacity 0.15s ease;
	}

	.item:hover {
		background: color-mix(in srgb, var(--page) 55%, transparent);
	}

	.item:last-child {
		border-bottom: none;
	}

	.item:last-child {
		border-bottom: none;
	}

	.item.done {
		opacity: 0.72;
	}

	.item.helping {
		opacity: 1;
	}

	.check {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		margin-top: 0.1rem;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}

	.box {
		display: grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border: 1.5px solid var(--border-strong);
		border-radius: 4px;
		color: var(--accent-contrast);
		background: transparent;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.12s ease;
	}

	.check:hover:not(:disabled) .box {
		border-color: var(--accent);
		transform: scale(1.06);
	}

	.item.done .box {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.main {
		min-width: 0;
		display: grid;
		gap: 0.35rem;
	}

	.name {
		margin: 0;
		font-family: var(--font-read);
		font-weight: 600;
		font-size: 1.12rem;
		line-height: 1.35;
		color: var(--ink-strong);
		overflow-wrap: break-word;
	}

	.item.done .name {
		color: var(--muted);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
		text-decoration-color: color-mix(in srgb, var(--muted) 55%, transparent);
	}

	.desc {
		margin: 0;
		font-size: 0.95rem;
		color: var(--muted);
		font-family: var(--font-read);
		line-height: 1.5;
		overflow-wrap: break-word;
		white-space: pre-wrap;
	}

	.name :global(a),
	.desc :global(a) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 0.15em;
		word-break: break-all;
	}

	.name :global(a):hover,
	.desc :global(a):hover {
		color: var(--accent-hover);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem 0.85rem;
		margin-top: 0.35rem;
	}

	.tool {
		border: none;
		background: none;
		padding: 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--faint);
		cursor: pointer;
	}

	.tool:hover:not(:disabled) {
		color: var(--ink);
	}

	.tool.on {
		color: var(--accent);
	}

	.tool.danger:hover:not(:disabled) {
		color: var(--danger);
	}

	.tool:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* ---- Inline panels (edit / help) --------------------------------- */
	.panel {
		grid-column: 1 / -1;
		display: grid;
		gap: 0.65rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--sheet) 88%, var(--accent-soft));
	}

	.panel.help {
		margin-top: 0.35rem;
		grid-column: auto;
	}

	.panel-label {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--faint);
	}

	.panel-input {
		font-family: var(--font-read);
		font-size: 1.05rem;
		font-weight: 600;
	}

	.panel-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}

	.help-ok {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--ok);
	}

	.help-ok a {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.more {
		display: flex;
		justify-content: center;
		margin-top: 1.15rem;
		padding-top: 0.35rem;
	}

	@media (max-width: 560px) {
		.page {
			padding-top: 1.5rem;
			max-width: none;
		}

		.board {
			padding: 1rem 0.95rem 1.15rem;
			border-radius: var(--radius);
			min-height: 14rem;
		}

		.composer {
			padding: 0.85rem 0.9rem;
		}

		.composer-row {
			grid-template-columns: 1fr;
		}

		.composer-row .btn {
			width: 100%;
		}

		.item {
			gap: 0.7rem;
			padding-right: 0;
		}

		.name {
			font-size: 1.05rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.item,
		.box {
			transition: none;
		}
	}
</style>
