package org.isis.webgme.corex;

import java.util.*;

public abstract class CorePath<NODE extends CorePath.Node<NODE>> {
	/**
	 * Actual nodes must implement this interface
	 */
	public interface Node<NODE> {
		public String getRelid();

		public NODE getParent();
	}

	/**
	 * Returns the parent of the given node. The parent of the root is
	 * <code>null</code>. The parent (and therefore the root) cannot change for
	 * any node (since moving a node to a separate location is not possible
	 * because of lost child references).
	 */
	public NODE getParent(NODE node) {
		return node.getParent();
	}

	/**
	 * Returns the relative identifier (unique within the parent) of the given
	 * node. The relative id of the root is <code>null</code>. This value can
	 * never change for a give node.
	 */
	public String getRelid(NODE node) {
		return node.getRelid();
	}

	/**
	 * Returns the level of the given node, which can never change. The level of
	 * the root is zero.
	 */
	public int getLevel(NODE node) {
		int level = 0;
		while ((node = node.getParent()) != null)
			level += 1;

		return level;
	}

	/**
	 * Returns the root of the tree to which this node belongs. This value can
	 * never change.
	 */
	public NODE getRoot(NODE node) {
		NODE parent;
		while ((parent = node.getParent()) != null)
			node = parent;

		return node;
	}

	/**
	 * Returns the path of the given node within its tree. You should not use
	 * paths in general (they are slow to generate and parse).
	 */
	public String getPath(NODE node) {
		ArrayList<String> path = new ArrayList<String>();

		String relid;
		while ((relid = node.getRelid()) != null) {
			path.add(relid);
			node = node.getParent();
		}

		StringBuilder builder = new StringBuilder();

		int i = path.size();
		while (--i >= 0) {
			builder.append('/');
			builder.append(path.get(i));
		}

		return builder.toString();
	}

	/**
	 * Checks if this node is attached to the root (meaning that it is still
	 * updated and its information is up to date).
	 */
	public abstract boolean isAttached(NODE node);

	/**
	 * Makes sure, that this node is again attached to the root and contains
	 * valid data (if it became deattached).
	 */
	public abstract NODE reattach(NODE node);

	/**
	 * Returns the common ancestor of the two nodes. Both nodes must be in the
	 * same tree.
	 */
	public NODE getAncestor(NODE first, NODE second) {
		first = reattach(first);
		second = reattach(second);

		ArrayList<NODE> a = new ArrayList<NODE>();
		do {
			a.add(first);
			first = first.getParent();
		} while (first != null);
		int i = a.size() - 1;

		ArrayList<NODE> b = new ArrayList<NODE>();
		do {
			b.add(second);
			second = second.getParent();
		} while (second != null);
		int j = b.size() - 1;

		// must have the same root
		assert (a.get(i) == b.get(j));

		while (i != 0 && j != 0 && a.get(i - 1) == b.get(j - 1)) {
			i -= 1;
			j -= 1;
		}

		return a.get(i);
	}

	/**
	 * Checks if <code>ancestor</code> is an ancestor of <code>node</code>. The
	 * two nodes must be in the same tree. Every node is considered to be an
	 * ancestor of itself.
	 */
	public boolean isAncestor(NODE node, NODE ancestor) {
		node = reattach(node);
		ancestor = reattach(ancestor);

		do {
			if (node == ancestor)
				return true;

			node = node.getParent();
		} while (node != null);

		return false;
	}

	/**
	 * Creates a new root node. This object can handle multiple roots.
	 */
	public abstract NODE createRoot();

	/**
	 * Returns a new child object for the given path. It is possible to create
	 * child nodes for any relid, they might not be attached to real data.
	 */
	public abstract NODE getChild(NODE node, String relid);

	/**
	 * Iteratively obtains the child (descendants) of the given node, with the
	 * relids that lead from the <code>base</code> node to the
	 * <code>head</node>. If <code>base</code> is the same as <code>head</code>,
	 * then original node is returned.
	 */
	public NODE getDescendant(NODE node, NODE head, NODE base) {
		assert (isAncestor(base, head));

		ArrayList<String> path = new ArrayList<String>();
		while (head != base) {
			path.add(node.getRelid());
			head = head.getParent();
		}

		int i = path.size();
		while (--i >= 0)
			node = getChild(node, path.get(i));

		return node;
	}
}
