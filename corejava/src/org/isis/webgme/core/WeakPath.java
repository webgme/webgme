package org.isis.webgme.core;

import java.util.*;
import java.lang.ref.*;

public class WeakPath extends CorePath<WeakNode> {

	@Override
	public WeakNode getParent(WeakNode node) {
		return node.parent;
	}

	@Override
	public String getRelid(WeakNode node) {
		return node.relid;
	}

	@Override
	public WeakNode createRoot() {
		return new WeakNode(null, null);
	}

	@Override
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

	@Override
	public boolean isAttached(WeakNode node) {
		return true;
	}

	@Override
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
