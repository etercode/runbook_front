<script>
	import { initials, hueFrom } from '$lib/util/format';

	/** @type {{ user: any, size?: number }} */
	let { user, size = 40 } = $props();
	let hue = $derived(hueFrom(user?.username ?? user?.name));
</script>

<span
	class="avatar"
	style="width:{size}px;height:{size}px;font-size:{size * 0.34}px;background:hsl({hue} 22% 36%)"
	title={user?.name ?? user?.username ?? ''}
>
	{initials(user)}
</span>

<style>
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		color: #f5f7fa;
		font-family: var(--font-brand);
		font-weight: 700;
		flex-shrink: 0;
		line-height: 1;
		user-select: none;
		letter-spacing: 0.02em;
	}
</style>
