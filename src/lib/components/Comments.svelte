<script>
	import * as api from '$lib/api/client';
	import { auth } from '$lib/auth/auth.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import { timeAgo } from '$lib/util/format';

	/**
	 * @type {{
	 *   postId: number,
	 *   comments?: any[],
	 *   commentCount?: number,
	 *   loginNext: string,
	 *   onCountChange?: (n: number) => void
	 * }}
	 */
	let {
		postId,
		comments = $bindable([]),
		commentCount = $bindable(0),
		loginNext,
		onCountChange
	} = $props();

	let body = $state('');
	let posting = $state(false);
	/** @type {number | null} */
	let replyTo = $state(null);
	let replyBody = $state('');
	let replyPosting = $state(false);

	/** @param {any[]} list */
	function buildThreads(list) {
		/** @type {Map<number, any>} */
		const byId = new Map();
		for (const c of list) {
			byId.set(c.id, { ...c, replies: [] });
		}
		/** @type {any[]} */
		const roots = [];
		for (const c of list) {
			const node = byId.get(c.id);
			const parentId = c.parentId ?? null;
			if (parentId != null && byId.has(parentId)) {
				byId.get(parentId).replies.push(node);
			} else {
				roots.push(node);
			}
		}
		roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		return roots;
	}

	let threads = $derived(buildThreads(comments ?? []));

	function canDelete(/** @type {any} */ c) {
		return auth.isAdmin || c.author?.id === auth.user?.id;
	}

	function startReply(/** @type {any} */ comment) {
		replyTo = comment.id;
		replyBody = '';
	}

	function cancelReply() {
		replyTo = null;
		replyBody = '';
	}

	async function submitTop(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		const text = body.trim();
		if (!text || posting) return;
		posting = true;
		try {
			const comment = await api.addComment(postId, text);
			comments = [...(comments ?? []), comment];
			commentCount = (commentCount ?? 0) + 1;
			onCountChange?.(commentCount);
			body = '';
		} catch {
			/* ignore */
		} finally {
			posting = false;
		}
	}

	async function submitReply(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		const text = replyBody.trim();
		if (!text || replyTo == null || replyPosting) return;
		replyPosting = true;
		try {
			const comment = await api.addComment(postId, text, replyTo);
			comments = [...(comments ?? []), comment];
			commentCount = (commentCount ?? 0) + 1;
			onCountChange?.(commentCount);
			cancelReply();
		} catch {
			/* ignore */
		} finally {
			replyPosting = false;
		}
	}

	async function removeComment(/** @type {any} */ comment) {
		if (!confirm('Delete this comment?')) return;
		try {
			await api.deleteComment(comment.id);
			comments = (comments ?? []).filter((/** @type {any} */ c) => c.id !== comment.id);
			commentCount = Math.max(0, (commentCount ?? 0) - 1);
			onCountChange?.(commentCount);
			if (replyTo === comment.id) cancelReply();
		} catch {
			/* ignore */
		}
	}
</script>

<section class="comments">
	<header class="head">
		<h2>Discussion</h2>
		{#if (commentCount ?? 0) > 0}
			<span class="count">{commentCount}</span>
		{/if}
	</header>

	{#if auth.isAuthenticated}
		<form class="composer" onsubmit={submitTop}>
			<div class="composer-row">
				<Avatar user={auth.user} size={40} />
				<textarea
					bind:value={body}
					placeholder="Share a thought, question, or tip…"
					rows="3"
					maxlength="5000"
				></textarea>
			</div>
			<div class="composer-actions">
				<button class="btn btn-sm" disabled={posting || !body.trim()}>
					{posting ? 'Posting…' : 'Comment'}
				</button>
			</div>
		</form>
	{:else}
		<p class="signin muted">
			<a href="/login?next={encodeURIComponent(loginNext)}">Log in</a> to join the discussion.
		</p>
	{/if}

	{#if threads.length === 0}
		<p class="empty muted">No comments yet — start the thread.</p>
	{:else}
		<ul class="thread-list">
			{#each threads as comment (comment.id)}
				<li class="thread">
					<div class="item">
						<Avatar user={comment.author} size={40} />
						<div class="main">
							<div class="meta">
								<strong>{comment.author?.name}</strong>
								<span class="dot" aria-hidden="true">·</span>
								<span class="time muted">{timeAgo(comment.createdAt)}</span>
								{#if canDelete(comment)}
									<button type="button" class="del" onclick={() => removeComment(comment)}>Delete</button>
								{/if}
							</div>
							<p class="text">{comment.body}</p>
							<div class="actions">
								{#if auth.isAuthenticated}
									<button type="button" class="reply-btn" onclick={() => startReply(comment)}>
										Reply
									</button>
								{/if}
								{#if comment.replies?.length}
									<span class="reply-count muted"
										>{comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}</span
									>
								{/if}
							</div>

							{#if replyTo === comment.id}
								<form class="reply-form" onsubmit={submitReply}>
									<textarea
										bind:value={replyBody}
										placeholder="Reply to {comment.author?.name}…"
										rows="3"
										maxlength="5000"
									></textarea>
									<div class="composer-actions">
										<button type="button" class="btn btn-ghost btn-sm" onclick={cancelReply}
											>Cancel</button
										>
										<button class="btn btn-sm" disabled={replyPosting || !replyBody.trim()}>
											{replyPosting ? 'Posting…' : 'Reply'}
										</button>
									</div>
								</form>
							{/if}

							{#if comment.replies?.length}
								<ul class="replies">
									{#each comment.replies as reply (reply.id)}
										<li class="item reply">
											<Avatar user={reply.author} size={32} />
											<div class="main">
												<div class="meta">
													<strong>{reply.author?.name}</strong>
													<span class="dot" aria-hidden="true">·</span>
													<span class="time muted">{timeAgo(reply.createdAt)}</span>
													{#if canDelete(reply)}
														<button type="button" class="del" onclick={() => removeComment(reply)}
															>Delete</button
														>
													{/if}
												</div>
												<p class="text">{reply.body}</p>
											</div>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.comments {
		min-width: 0;
		width: 100%;
		max-width: none;
		margin-top: 0;
		padding-top: 2.5rem;
		border-top: 1px solid var(--line);
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.75rem;
	}

	.head h2 {
		margin: 0;
		font-family: var(--font-brand);
		font-weight: 700;
		font-size: 1.35rem;
		letter-spacing: -0.02em;
		color: var(--ink-strong);
	}

	.count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.6rem;
		height: 1.6rem;
		padding: 0 0.45rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.composer {
		margin-bottom: 2.25rem;
	}

	.composer-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

	.composer textarea,
	.reply-form textarea {
		width: 100%;
		min-height: 6.5rem;
		padding: 0.95rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		background: var(--sheet);
		resize: vertical;
		margin: 0;
		font-family: var(--font-read);
		font-size: 1.05rem;
		line-height: 1.55;
		color: var(--ink);
		box-sizing: border-box;
	}

	.composer textarea:focus,
	.reply-form textarea:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-soft);
	}

	.composer-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
		margin-top: 0.85rem;
	}

	.composer .composer-actions {
		padding-left: calc(40px + 1rem);
	}

	.signin {
		margin: 0 0 2rem;
		padding: 1.1rem 1.25rem;
		border: 1px dashed var(--line);
		border-radius: var(--radius-lg);
		font-size: 0.98rem;
	}

	.empty {
		margin: 0;
		padding: 0.5rem 0 1rem;
		font-size: 1rem;
	}

	.thread-list,
	.replies {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.thread-list {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.thread {
		padding: 1.5rem 0;
		border-bottom: 1px solid var(--line-soft);
	}

	.thread:first-child {
		padding-top: 0.35rem;
	}

	.thread:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.item {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 1rem;
		align-items: start;
	}

	.main {
		min-width: 0;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.35rem 0.45rem;
		margin-bottom: 0.45rem;
	}

	.meta strong {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--ink-strong);
	}

	.dot {
		color: var(--faint);
		opacity: 0.7;
	}

	.time {
		font-size: 0.85rem;
	}

	.text {
		margin: 0;
		font-family: var(--font-read);
		font-size: 1.08rem;
		line-height: 1.65;
		white-space: pre-wrap;
		overflow-wrap: break-word;
		color: var(--ink);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 0.85rem;
	}

	.reply-btn {
		border: none;
		background: none;
		padding: 0.2rem 0;
		font-size: 0.85rem;
		font-weight: 650;
		color: var(--accent);
		font-family: var(--font-ui);
	}

	.reply-btn:hover {
		color: var(--accent-hover);
		text-decoration: underline;
	}

	.reply-count {
		font-size: 0.82rem;
	}

	.del {
		margin-left: auto;
		border: none;
		background: none;
		color: var(--faint);
		font-size: 0.8rem;
		padding: 0.15rem 0;
	}

	.del:hover {
		color: var(--danger);
	}

	.reply-form {
		margin-top: 1rem;
		padding: 1rem 0 0;
	}

	.reply-form textarea {
		min-height: 5.5rem;
	}

	.replies {
		margin-top: 1.35rem;
		padding: 1.15rem 0 0 0.25rem;
		border-left: 2px solid var(--line);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding-left: 1.15rem;
	}

	.reply .text {
		font-size: 1.02rem;
		line-height: 1.6;
	}

	@media (max-width: 640px) {
		.comments {
			padding-top: 2rem;
		}

		.composer-row,
		.item {
			gap: 0.75rem;
		}

		.composer .composer-actions {
			padding-left: 0;
		}

		.composer textarea,
		.reply-form textarea {
			font-size: 1rem;
			min-height: 5.5rem;
			padding: 0.85rem 0.95rem;
		}

		.text {
			font-size: 1.02rem;
		}

		.replies {
			padding-left: 0.85rem;
			margin-top: 1.1rem;
			gap: 1.1rem;
		}
	}
</style>
