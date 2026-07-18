<script>
	import { onMount } from 'svelte';
	import * as api from '$lib/api/client';

	/** @typedef {{ id: number, name: string, label: string, model: string, models: string[], hasApiKey: boolean, active: boolean }} Provider */
	/** @typedef {{
	 *   askHelpSystemPrompt: string,
	 *   askHelpSystemPromptCustom: string|null,
	 *   askHelpSystemPromptDefault: string,
	 *   askHelpSystemPromptIsCustom: boolean
	 * }} AiSettings */

	let providers = $state(/** @type {Provider[]} */ ([]));
	let loading = $state(true);
	let error = $state('');
	let busy = $state(/** @type {string | null} */ (null));
	let promptBusy = $state(false);
	let promptSaved = $state(false);

	/** @type {Record<string, { model: string, apiKey: string }>} */
	let drafts = $state({});

	let promptDraft = $state('');
	let promptDefault = $state('');
	let promptIsCustom = $state(false);

	async function load() {
		loading = true;
		error = '';
		try {
			const [res, settings] = await Promise.all([
				api.adminListAiProviders(),
				api.adminGetAiSettings()
			]);
			providers = res.items ?? [];
			/** @type {Record<string, { model: string, apiKey: string }>} */
			const next = {};
			for (const p of providers) {
				next[p.name] = { model: p.model, apiKey: '' };
			}
			drafts = next;
			applySettings(/** @type {AiSettings} */ (settings));
		} catch {
			error = 'Failed to load AI settings.';
		} finally {
			loading = false;
		}
	}

	/** @param {AiSettings} settings */
	function applySettings(settings) {
		promptDefault = settings.askHelpSystemPromptDefault ?? '';
		promptIsCustom = !!settings.askHelpSystemPromptIsCustom;
		promptDraft = settings.askHelpSystemPrompt ?? promptDefault;
		promptSaved = false;
	}

	onMount(load);

	/** @param {Provider} p */
	async function save(p) {
		const draft = drafts[p.name];
		if (!draft || busy) return;
		busy = p.name;
		error = '';
		try {
			/** @type {{ model: string, apiKey?: string }} */
			const data = { model: draft.model };
			if (draft.apiKey.trim() !== '') {
				data.apiKey = draft.apiKey.trim();
			}
			const updated = await api.adminUpdateAiProvider(/** @type {'gemini'|'deepseek'} */ (p.name), data);
			providers = providers.map((x) => (x.name === updated.name ? { ...x, ...updated } : x));
			drafts = {
				...drafts,
				[p.name]: { model: updated.model, apiKey: '' }
			};
		} catch (err) {
			error = /** @type {any} */ (err)?.body?.message ?? 'Could not save provider.';
		} finally {
			busy = null;
		}
	}

	/** @param {Provider} p */
	async function activate(p) {
		if (p.active || busy) return;
		busy = p.name;
		error = '';
		try {
			await api.adminUpdateAiProvider(/** @type {'gemini'|'deepseek'} */ (p.name), { active: true });
			providers = providers.map((x) => ({ ...x, active: x.name === p.name }));
		} catch {
			error = 'Could not activate provider.';
		} finally {
			busy = null;
		}
	}

	/** @param {Provider} p */
	async function clearKey(p) {
		if (!p.hasApiKey || !confirm(`Clear API key for ${p.label}?`)) return;
		busy = p.name;
		error = '';
		try {
			const updated = await api.adminUpdateAiProvider(/** @type {'gemini'|'deepseek'} */ (p.name), {
				apiKey: ''
			});
			providers = providers.map((x) => (x.name === updated.name ? { ...x, ...updated } : x));
		} catch {
			error = 'Could not clear key.';
		} finally {
			busy = null;
		}
	}

	async function savePrompt() {
		if (promptBusy) return;
		promptBusy = true;
		error = '';
		promptSaved = false;
		try {
			const settings = await api.adminUpdateAiSettings({
				askHelpSystemPrompt: promptDraft.trim() || null
			});
			applySettings(/** @type {AiSettings} */ (settings));
			promptSaved = true;
		} catch (err) {
			error = /** @type {any} */ (err)?.body?.message ?? 'Could not save system prompt.';
		} finally {
			promptBusy = false;
		}
	}

	async function resetPrompt() {
		if (promptBusy) return;
		promptBusy = true;
		error = '';
		promptSaved = false;
		try {
			const settings = await api.adminUpdateAiSettings({ askHelpSystemPrompt: null });
			applySettings(/** @type {AiSettings} */ (settings));
			promptSaved = true;
		} catch {
			error = 'Could not reset system prompt.';
		} finally {
			promptBusy = false;
		}
	}

	function loadDefaultIntoEditor() {
		promptDraft = promptDefault;
		promptSaved = false;
	}
</script>

<svelte:head><title>AI providers — Studio</title></svelte:head>

<div class="studio-header">
	<div>
		<h2 class="studio-title">AI providers</h2>
		<p class="studio-subtitle">
			API keys are stored encrypted in the database. One provider is active for Ask help and future AI features.
		</p>
	</div>
</div>

{#if error}
	<div class="alert alert-error">{error}</div>
{/if}

{#if loading}
	<div class="center-state"><span class="spinner"></span></div>
{:else}
	<div class="grid">
		{#each providers as p (p.name)}
			<section class="card" class:active={p.active}>
				<header class="card-head">
					<div>
						<h3>{p.label}</h3>
						<p class="meta">
							{#if p.active}
								<span class="badge">Active</span>
							{:else}
								<button type="button" class="linkish" disabled={busy === p.name} onclick={() => activate(p)}>
									Make active
								</button>
							{/if}
							·
							{#if p.hasApiKey}
								<span class="ok">Key saved</span>
								<button type="button" class="linkish danger" disabled={busy === p.name} onclick={() => clearKey(p)}>
									Clear
								</button>
							{:else}
								<span class="warn">No key</span>
							{/if}
						</p>
					</div>
				</header>

				<div class="field">
					<label for="model-{p.name}">Model</label>
					<select id="model-{p.name}" bind:value={drafts[p.name].model}>
						{#each p.models as m (m)}
							<option value={m}>{m}</option>
						{/each}
						{#if !p.models.includes(drafts[p.name]?.model)}
							<option value={drafts[p.name]?.model}>{drafts[p.name]?.model}</option>
						{/if}
					</select>
				</div>

				<div class="field">
					<label for="key-{p.name}">
						API key
						<span class="faint">{p.hasApiKey ? '(leave blank to keep current)' : ''}</span>
					</label>
					<input
						id="key-{p.name}"
						type="password"
						autocomplete="off"
						placeholder={p.hasApiKey ? '••••••••' : 'Paste API key'}
						bind:value={drafts[p.name].apiKey}
					/>
				</div>

				<button type="button" class="btn btn-sm" disabled={busy === p.name} onclick={() => save(p)}>
					{busy === p.name ? 'Saving…' : 'Save'}
				</button>
			</section>
		{/each}
	</div>

	<section class="prompt card">
		<header class="card-head">
			<div>
				<h3>Ask help — system prompt</h3>
				<p class="meta">
					{#if promptIsCustom}
						<span class="badge">Custom</span>
						<span>Saved override is used at runtime.</span>
					{:else}
						<span class="ok">Default</span>
						<span>Built-in prompt (faithful source → Markdown).</span>
					{/if}
				</p>
			</div>
		</header>

		<div class="field">
			<label for="ask-help-prompt">System prompt</label>
			<textarea
				id="ask-help-prompt"
				class="prompt-area"
				rows="18"
				spellcheck="false"
				bind:value={promptDraft}
				oninput={() => (promptSaved = false)}
			></textarea>
		</div>

		<div class="prompt-actions">
			<button type="button" class="btn btn-sm" disabled={promptBusy} onclick={savePrompt}>
				{promptBusy ? 'Saving…' : 'Save prompt'}
			</button>
			<button type="button" class="btn btn-ghost btn-sm" disabled={promptBusy} onclick={loadDefaultIntoEditor}>
				Load default
			</button>
			<button type="button" class="btn btn-ghost btn-sm" disabled={promptBusy || !promptIsCustom} onclick={resetPrompt}>
				Reset to default
			</button>
			{#if promptSaved}
				<span class="ok saved">Saved</span>
			{/if}
		</div>
	</section>
{/if}

<style>
	.grid {
		display: grid;
		gap: 1.25rem;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		margin-bottom: 1.25rem;
	}

	.card {
		padding: 1.25rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-lg, var(--radius));
		background: var(--sheet);
		display: grid;
		gap: 0.85rem;
	}

	.card.active {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px var(--accent-soft);
	}

	.card-head h3 {
		margin: 0 0 0.35rem;
		font-family: var(--font-brand);
		font-size: 1.15rem;
	}

	.meta {
		margin: 0;
		font-size: 0.85rem;
		color: var(--muted);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.5rem;
	}

	.badge {
		display: inline-block;
		padding: 0.1rem 0.45rem;
		border-radius: 3px;
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 700;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.ok {
		color: var(--accent);
		font-weight: 600;
	}

	.warn {
		color: #a46a1f;
		font-weight: 600;
	}

	.linkish {
		border: none;
		background: none;
		padding: 0;
		font: inherit;
		font-weight: 600;
		color: var(--accent);
		cursor: pointer;
	}

	.linkish:hover:not(:disabled) {
		text-decoration: underline;
	}

	.linkish.danger {
		color: #b0413e;
	}

	.card .btn {
		justify-self: start;
	}

	.prompt {
		max-width: 52rem;
	}

	.prompt-area {
		width: 100%;
		min-height: 18rem;
		resize: vertical;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.82rem;
		line-height: 1.45;
		padding: 0.85rem 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--page);
		color: var(--ink);
	}

	.prompt-area:focus {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}

	.prompt-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.55rem;
	}

	.saved {
		font-size: 0.85rem;
	}
</style>
