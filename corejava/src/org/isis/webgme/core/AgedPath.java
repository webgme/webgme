package org.isis.webgme.core;

public class AgedPath extends CorePath<AgedNode> {

	private final int maxAge;

	public AgedPath(int maxAge) {
		this.maxAge = maxAge;
	}

	@Override
	public AgedNode getParent(AgedNode node) {
		return node.parent;
	}

	@Override
	public String getRelid(AgedNode node) {
		return node.relid;
	}

	@Override
	public AgedNode createRoot() {
		return new AgedNode(null, null);
	}

	@Override
	public AgedNode getChild(AgedNode node, String relid) {
		for (AgedNode child : node.children) {
			if (relid.equals(child.relid))
				return child;
		}

		return new AgedNode(node, relid);
	}

	private AgedNode attach(AgedNode node) {
		if (node.age == 0)
			;
		else if (node.age < maxAge) {
			do {
				node.age = 0;
				node = node.parent;
			} while (node != null);
		} else {
			AgedNode parent = attach(node.parent);

			for (AgedNode child : parent.children) {
				if (node.relid.equals(child.relid)) {
					child.age = 0;
					return child;
				}
			}

			node.parent = parent;
			parent.children.add(node);
		}

		return node;
	}

	@Override
	public AgedNode getAncestor(AgedNode first, AgedNode second) {
		first = attach(first);
		second = attach(second);

		return super.getAncestor(first, second);
	}

	@Override
	public boolean isAncestor(AgedNode node, AgedNode ancestor) {
		node = attach(node);
		ancestor = attach(ancestor);

		return super.isAncestor(node, ancestor);
	}

	@Override
	public AgedNode getDescendant(AgedNode node, AgedNode head, AgedNode base) {
		node = attach(node);
		head = attach(head);
		base = attach(base);

		return super.getDescendant(node, head, base);
	}
}
