package org.isis.webgme.core;

import java.lang.ref.WeakReference;
import java.util.*;

public class WeakPath /* implements CorePath<WeakNode> */ {

	public WeakNode getParent(WeakNode node) {
		return node.parent;
	}

	public String getRelid(WeakNode node) {
		return node.relid;
	}

	public int getLevel(WeakNode node) {
		int level = 0;
		while ((node = node.parent) != null)
			level += 1;

		return level;
	}

	public WeakNode getRoot(WeakNode node) {
		WeakNode parent;
		while ((parent = node.parent) != null)
			node = parent;

		return node;
	}

	public String getPath(WeakNode node) {
		ArrayList<String> path = new ArrayList<String>();

		do {
			path.add(node.relid);
			node = node.parent;
		} while (node.relid != null);

		StringBuilder builder = new StringBuilder();

		int i = path.size();
		while (--i >= 0) {
			builder.append('/');
			builder.append(path.get(i));
		}

		return builder.toString();
	}

	public WeakNode getAncestor(WeakNode first, WeakNode second) {
		ArrayList<WeakNode> a = new ArrayList<WeakNode>();
		do {
			a.add(first);
			first = first.parent;
		} while (first != null);
		int i = a.size() - 1;

		ArrayList<WeakNode> b = new ArrayList<WeakNode>();
		do {
			b.add(second);
			second = second.parent;
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

	public boolean isAncestor(WeakNode node, WeakNode ancestor) {
		assert (node != null && ancestor != null);

		do {
			if (node == ancestor)
				return true;

			node = node.parent;
		} while (node != null);

		return false;
	}

	public WeakNode getDescendant(WeakNode node, WeakNode head, WeakNode base) {
		assert (isAncestor(base, head));

		ArrayList<String> path = new ArrayList<String>();
		while (head != base) {
			path.add(node.relid);
			head = head.parent;
		}

		int i = path.size();
		while (--i >= 0)
			node = getChild(node, path.get(i));

		return node;
	}

	public WeakNode createRoot() {
		return new WeakNode(null, null);
	}

	public WeakNode getChild(WeakNode node, String relid) {
		ArrayList<WeakReference<WeakNode>> children = node.children;
		int i = children.size();
		while (--i >= 0) {
			WeakReference<WeakNode> ref = children.get(i);
			WeakNode child = ref.get();
			if (child == null) {
				// fill the whole
				children.set(i, children.remove(children.size() - 1));
			} else if (relid.equals(child.relid))
				return child;
		}

		WeakNode child = new WeakNode(node, relid);
		children.add(new WeakReference<WeakNode>(child));

		return child;
	}

	public List<WeakNode> getChildren(WeakNode node) {
		ArrayList<WeakNode> ret = new ArrayList<WeakNode>();

		ArrayList<WeakReference<WeakNode>> children = node.children;
		int i = children.size();
		while (--i >= 0) {
			WeakReference<WeakNode> ref = children.get(i);
			WeakNode child = ref.get();
			if (child == null) {
				// fill the whole
				children.set(i, children.remove(children.size() - 1));
			} else
				ret.add(child);
		}

		return ret;
	}
}
