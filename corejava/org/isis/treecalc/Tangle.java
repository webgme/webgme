package org.isis.treecalc;

public class Tangle<NodeType extends Tangle.Node> {

    protected Factory<NodeType> factory;

    public Tangle(Factory<NodeType> factory) {
	this.factory = factory;
    }

    public static abstract class Factory<NodeType> {
	protected abstract NodeType create();
	protected abstract NodeType clone(NodeType node);
    }

    public static class Node {

	protected long[] relids;
	protected Node[] children;
	protected int length;

	protected Node() {
	    relids = new long[10];
	    children = null;
	    length = 0;
	}

	protected Node(Node node) {
	    relids = node.relids.clone();
	    children = node.children.clone();
	    length = node.length;
	}

	protected void setChild(long relid, Node child) {
	}

	protected Node getChild(long relid) {
	    return null;
	}
    }

    public class Reader {
	protected Reader parent;
	protected long relid;
	protected int level;
	protected NodeType node;

	protected Reader(Reader parent, long relid, int level, NodeType node) {
	    assert (node != null);

	    this.parent = parent;
	    this.relid = relid;
	    this.level = level;

	    this.node = node;
	}

	public long getRelid() {
	    return relid;
	}

	public int getLevel() {
	    return level;
	}

	public Reader getParent() {
	    return parent;
	}

	@SuppressWarnings("unchecked")
	public Reader getChild(long relid) {
	    NodeType child = (NodeType)node.getChild(relid);
	    return child != null ? new Reader(this, relid, level + 1, child)
		    : null;
	}

	public NodeType read() {
	    return node;
	}
    }

    public class Writer {
	protected Writer parent;
	protected long relid;
	protected int level;

	protected NodeType oldNode;
	protected NodeType newNode;

	protected Writer(Writer parent, long relid, int level,
		NodeType oldNode, NodeType newNode) {
	    assert (newNode != null);

	    this.parent = parent;
	    this.relid = relid;
	    this.level = level;

	    this.oldNode = oldNode;
	    this.newNode = newNode;
	}

	public long getRelid() {
	    return relid;
	}

	public int getLevel() {
	    return level;
	}

	public Writer getParent() {
	    return parent;
	}

	@SuppressWarnings("unchecked")
	public Writer getChild(long relid) {
	    NodeType oldChild = oldNode != null ? (NodeType) oldNode
		    .getChild(relid) : null;
	    NodeType newChild = newNode != null ? (NodeType) newNode
		    .getChild(relid) : null;

	    return new Writer(this, relid, level + 1, oldChild, newChild);
	}

	public NodeType read() {
	    return oldNode;
	}

	@SuppressWarnings("unchecked")
	public NodeType modify() {
	    assert (oldNode != null);

	    if (newNode == null) {
		if (parent != null) {
		    NodeType parentNode = parent.modify();
		    newNode = parentNode != null ? (NodeType) parentNode
			    .getChild(relid) : null;

		    if (newNode == oldNode)
			newNode = (NodeType) factory.clone(oldNode);
		} else
		    newNode = (NodeType) factory.clone(oldNode);
	    }

	    return newNode;
	}
    }
}
