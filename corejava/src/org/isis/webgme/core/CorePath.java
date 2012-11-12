package org.isis.webgme.core;

import java.util.ArrayList;

public abstract class CorePath<NODE> {
	public abstract NODE getParent(NODE node);

	public abstract String getRelid(NODE node);

	public abstract NODE createRoot();

	public abstract NODE getChild(NODE node, String relid);

	public int getLevel(NODE node) {
		int level = 0;
		while ((node = getParent(node)) != null)
			level += 1;

		return level;
	}

	public NODE getRoot(NODE node) {
		NODE parent;
		while ((parent = getParent(node)) != null)
			node = parent;

		return node;
	}

	public String getPath(NODE node) {
		ArrayList<String> path = new ArrayList<String>();

		String relid = getRelid(node);
		while (relid != null) {
			path.add(relid);
			node = getParent(node);
			relid = getRelid(node);
		}

		StringBuilder builder = new StringBuilder();

		int i = path.size();
		while (--i >= 0) {
			builder.append('/');
			builder.append(path.get(i));
		}

		return builder.toString();
	}

	public NODE getAncestor(NODE first, NODE second) {
		ArrayList<NODE> a = new ArrayList<NODE>();
		do {
			a.add(first);
			first = getParent(first);
		} while (first != null);
		int i = a.size() - 1;

		ArrayList<NODE> b = new ArrayList<NODE>();
		do {
			b.add(second);
			second = getParent(second);
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

	public boolean isAncestor(NODE node, NODE ancestor) {
		assert (node != null && ancestor != null);

		do {
			if (node == ancestor)
				return true;

			node = getParent(node);
		} while (node != null);

		return false;
	}

	public NODE getDescendant(NODE node, NODE head, NODE base) {
		assert (isAncestor(base, head));

		ArrayList<String> path = new ArrayList<String>();
		while (head != base) {
			path.add(getRelid(head));
			head = getParent(head);
		}

		int i = path.size();
		while (--i >= 0)
			node = getChild(node, path.get(i));

		return node;
	}
}
