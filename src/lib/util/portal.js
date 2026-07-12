/**
 * Move a node to document.body so fixed overlays escape overflow/transform ancestors.
 * @param {HTMLElement} node
 */
export function portal(node) {
	const parent = document.body;
	parent.appendChild(node);
	return {
		destroy() {
			if (node.parentNode) node.parentNode.removeChild(node);
		}
	};
}
