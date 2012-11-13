package org.isis.webgme.core;

import java.util.*;

public class AgedPath extends CorePath<AgedNode> {

	private final int maxAge;
	private final int maxCounter;

	public AgedPath(int maxAge, int maxCounter) {
		this.maxAge = maxAge;
		this.maxCounter = maxCounter;
	}

	private int counter = 0;
	private ArrayList<AgedNode> roots = new ArrayList<AgedNode>();

	private void detachNode(AgedNode node) {
		for (AgedNode child : node.children)
			detachNode(child);

		node.children.clear();
		node.age = maxAge;
	}

	private void ageNodes(ArrayList<AgedNode> nodes) {
		int i = nodes.size();
		while (--i >= 0) {
			AgedNode node = nodes.get(i);
			if (++node.age >= maxAge) {
				nodes.set(i, nodes.remove(nodes.size() - 1));
				detachNode(node);
			} else
				ageNodes(node.children);
		}
	}

	private void ageRoots() {
		if (++counter >= maxCounter) {
			counter = 0;
			ageNodes(roots);
		}
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
		ageRoots();

		AgedNode node = new AgedNode(null, null);
		roots.add(node);

		return node;
	}

	@Override
	public AgedNode getChild(AgedNode node, String relid) {
		for (AgedNode child : node.children) {
			if (relid.equals(child.relid)) {
				child = attach(child);
				return child;
			}
		}

		ageRoots();
		node = attach(node);

		AgedNode child = new AgedNode(node, relid);
		node.children.add(child);

		return child;
	}

	private AgedNode attach(AgedNode node) {
		if (node.age == 0)
			;
		else if (node.age < maxAge) {
			AgedNode parent = node;
			do {
				assert (parent.age < maxAge);
				parent.age = 0;

				parent = parent.parent;
			} while (parent != null && parent.age != 0);
		} else {
			AgedNode parent = node.parent;
			if (parent == null) {
				assert (!roots.contains(node));
				roots.add(node);

				node.age = 0;
			} else {
				parent = attach(parent);

				for (AgedNode child : parent.children) {
					if (node.relid.equals(child.relid)) {
						child.age = 0;
						return child;
					}
				}

				node.age = 0;
				node.parent = parent;
				parent.children.add(node);
			}
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

	@Override
	public boolean isAttached(AgedNode node) {
		return node.age < maxAge;
	}

	@Override
	public List<AgedNode> getChildren(AgedNode node) {
		return Collections.unmodifiableList(node.children);
	}

}
