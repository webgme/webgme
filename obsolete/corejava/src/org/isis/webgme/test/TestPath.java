package org.isis.webgme.test;

import org.isis.webgme.core3.*;

public class TestPath {
	public static void main(String[] args) {
		CorePath<AgedNode> path = new AgedPath(2,1);
		AgedNode root = path.createRoot();

		path.getChild(root, "a");
		path.getChild(root, "b");
		AgedNode c = path.getChild(root, "c");
		path.getChild(c, "d");

		System.gc();

		path.printTree(root);
	}
}
