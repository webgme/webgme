package org.isis.webgme.core;

import java.util.*;

public class CorePath<Node> {
	public interface Manager<Node> {
		Node getParent(Node node);

		void setParent(Node node, Node parent);

		String getRelid(Node node);

		int getAge(Node node);

		void setAge(Node node, int age);

		List<Node> getChildren(Node node);

		Node getChild(Node node, String relid);

		void setChild(Node node, Node child);
	}

	private final Manager<Node> manager;
	private final int maxAge;

	public CorePath(Manager<Node> manager) {
		this.manager = manager;
		this.maxAge = 3;
	}

	public final Node getParent(Node node) {
		return manager.getParent(node);
	}

	public final void setParent(Node node, Node parent) {
		manager.setParent(node, parent);
	}

	public final String getRelid(Node node) {
		return manager.getRelid(node);
	}

	public final int getAge(Node node) {
		return manager.getAge(node);
	}

	public final void setAge(Node node, int age) {
		manager.setAge(node, age);
	}

	public final List<Node> getChildren(Node node) {
		return manager.getChildren(node);
	}

	public final Node getChild(Node node, String relid) {
		return manager.getChild(node, relid);
	}

	public final void setChild(Node node, Node child) {
		manager.setChild(node, child);
	}

	private static void verify(String what, boolean cond)
			throws IllegalStateException {
		if (!cond) {
			throw new IllegalStateException(what);
		}
	}

	public boolean isValid(Node node) {
		try {
			verify("node", node != null);

			verify("age", getAge(node) >= 0 && getAge(node) <= maxAge);

			verify("relid",
					(getRelid(node) == null) == (getRelid(node) == null));

			verify("aging", getParent(node) == null
					|| getAge(getParent(node)) <= getAge(node));

			verify("detached",
					(getAge(node) < maxAge) == (getChildren(node) != null));
		} catch (IllegalStateException exception) {
			System.err.println("WRONG NODE: " + exception.getMessage()
					+ " error");
			return false;
		}

		return true;
	}

	public int getLevel(Node node) {
		int level = 0;
		for (;;) {
			node = getParent(node);
			if (node == null)
				return level;

			++level;
		}
	}

	public Node getRoot(Node node) {
		for (;;) {
			Node parent = getParent(node);
			if (parent == null)
				return node;

			node = parent;
		}
	}

	public Node getAncestor(Node first, Node second) {
		ArrayList<Node> a = new ArrayList<Node>();
		do {
			a.add(first);
			first = getParent(first);
		} while (first != null);
		int i = a.size() - 1;

		ArrayList<Node> b = new ArrayList<Node>();
		do {
			b.add(second);
			second = getParent(second);
		} while (second != null);
		int j = b.size() - 1;

		// must have the same root
		assert (a.get(i) == b.get(j));

		while (i != 0 && a.get(i - 1) == b.get(--j)) {
			--i;
		}

		return a.get(i);
	}

	public boolean isAttached(Node node) {
		return getAge(node) < maxAge;
	}

	public Node attach(Node node) {
		if (getAge(node) >= maxAge) {
			Node parent = attach(getParent(node));
			Node child = getChild(parent, getRelid(node));

			if (child == null) {
				child = node;
				setParent(node, parent);
				setChild(parent, node);
			}

			setAge(child, 0);
			return child;
		} else {
			Node other = node;
			while (getAge(other) != 0) {
				setAge(other, 0);
				other = getParent(other);
			}

			return node;
		}
	}
}
