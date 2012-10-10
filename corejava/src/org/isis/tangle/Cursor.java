package org.isis.tangle;

public class Cursor {
	public Cursor(Node node) {
		assert (node != null && !node.isMutable());

		this.parent = null;
		this.relid = 0;
		this.level = 0;

		this.node = node;
	}

	protected Cursor parent;

	public Cursor getParent() {
		return parent;
	}

	protected Cursor(Cursor parent, long relid, int level, Node node) {
		assert (parent != null && node != null);

		// a non-mutable parent cannot have a mutable child
		assert (!node.isMutable() || parent.node.isMutable());

		this.parent = parent;
		this.relid = relid;
		this.level = level;

		this.node = node;
	}

	public Cursor getChild(long relid) {
		Node child = node.getChild(relid);
		return new Cursor(this, relid, level + 1, child);
	}

	protected long relid;

	public long getRelid() {
		return relid;
	}

	protected int level;

	public int getLevel() {
		return level;
	}

	protected Node node;

	@SuppressWarnings("unchecked")
	public <NodeType extends Node> NodeType read() {
		assert (node != null);
		return (NodeType) node;
	}

	@SuppressWarnings("unchecked")
	public <NodeType extends Node> NodeType write() {
		assert (node != null);

		if (!node.isMutable()) {
			// if this assertion fails, then the current node has been deleted
			assert (parent == null || parent.read().getChild(relid) == node);

			node = node.clone();

			if (parent != null)
				parent.write().setChild(relid, node);
		}

		return (NodeType) node;
	}
}
