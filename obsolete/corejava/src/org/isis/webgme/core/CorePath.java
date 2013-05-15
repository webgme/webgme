package org.isis.webgme.core;

public interface CorePath<Node> {
	/**
	 * Returns the parent of the given node. The parent of the root is
	 * <code>null</code>. The parent (and therefore the root) cannot change for
	 * any node (since moving a node to a separate location is not possible
	 * because of lost child references).
	 */
	public Node getParent(Node node);

	/**
	 * Returns the relative identifier (unique within the parent) of the given
	 * node. The relative id of the root is <code>null</code>. This value can
	 * never change for a give node.
	 */
	public String getRelid(Node node);

	/**
	 * Returns the level of the given node, which can never change. The level of
	 * the root is zero.
	 */
	public int getLevel(Node node);

	/**
	 * Returns the root of the tree to which this node belongs. This value can
	 * never change.
	 */
	public Node getRoot(Node node);

	/**
	 * Returns the path of the given node within its tree. You should not use
	 * paths in general (they are slow to generate and parse).
	 */
	public String getPath(Node node);

	/**
	 * Returns the common ancestor of the two nodes. Both nodes must be in the
	 * same tree.
	 */
	public Node getAncestor(Node first, Node second);

	/**
	 * Checks if <code>ancestor</code> is an ancestor of <code>node</code>. The
	 * two nodes must be in the same tree. Every node is considered to be an
	 * ancestor of itself.
	 */
	public boolean isAncestor(Node node, Node ancestor);

	/**
	 * Creates a new root node. This object can handle multiple roots.
	 */
	public Node createRoot();

	/**
	 * Returns a new child object for the given path. It is possible to create
	 * child nodes for any relid, they might not be attached to real data.
	 */
	public Node getChild(Node node, String relid);

	/**
	 * Iteratively obtains the child (descendants) of the given node, with the
	 * relids that lead from the <code>base</code> node to the
	 * <code>head</node>. If <code>base</code> is the same as <code>head</code>,
	 * then original node is returned.
	 */
	public Node getDescendant(Node node, Node head, Node base);
}
