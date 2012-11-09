package org.isis.webgme.core;

import java.util.*;

public class CoreTree {
	public static class Node {
		Node parent;
		String relid;
		int life; // decremented, if zero then detached
		ArrayList<Node> children;
		Object data;

		public Node getParent() {
			return parent;
		}

		public String getRelid() {
			return relid;
		}

		public Object getData() {
			return data;
		}

		void verify() {
			assert ((relid == null) == (parent == null));
			assert (life >= 0);
			assert ((parent == null && life > 0) || life <= parent.life);
			assert ((life == 0) == (children == null));
		}

		public int getLevel() {
			int level = 0;

			Node node = parent;
			while (node != null) {
				++level;
				node = node.parent;
			}

			return level;
		}

		public Node getRoot() {
			Node node = this;
			while (node.parent != null) {
				node = node.parent;
			}

			return node;
		}

		void buildPath(StringBuilder builder) {
			if (parent != null) {
				parent.buildPath(builder);
				builder.append('/');
				builder.append(relid);
			}
		}

		public String getPath() {
			StringBuilder builder = new StringBuilder();
			buildPath(builder);
			return builder.toString();
		}

		public boolean isAttached() {
			return life > 0;
		}

		public Node getAncestor(Node other) {
			assert (other != null);

			Node node = this;
			ArrayList<Node> a = new ArrayList<Node>();
			do {
				a.add(node);
				node = node.parent;
			} while (node != null);
			int i = a.size() - 1;

			ArrayList<Node> b = new ArrayList<Node>();
			do {
				b.add(other);
				other = other.parent;
			} while (other != null);
			int j = b.size() - 1;

			// must have the same root
			assert (a.get(i) == b.get(j));

			while (i != 0 && a.get(i - 1) == b.get(--j)) {
				--i;
			}

			return a.get(i);
		}

		Node getAttachedChild(String relid) {
			if (children != null) {
				Iterator<Node> iter = children.iterator();
				while (iter.hasNext()) {
					Node child = iter.next();
					if (child.relid == relid)
						return child;
				}
			}
			return null;
		}
	};

	final int maxLife;

	public CoreTree() {
		this.maxLife = 3;
	}

	public Node attach(Node node) {
		if (node.life == 0) {
			Node parent = attach(node.parent);
			Node child = parent.getAttachedChild(node.relid);

			if (child != null) {
				child.life = maxLife;
				node = child;
			} else {
				node.parent = parent;
				node.life = maxLife;
				parent.addAttachedChild(node);
			}
		} else {
			Node other = node;
			while (other.life < maxLife) {
				other.life = maxLife;
				other = other.parent;
			}
		}
		return node;
	}
}
