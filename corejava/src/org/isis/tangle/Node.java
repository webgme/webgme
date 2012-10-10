package org.isis.tangle;

public class Node {

	protected boolean mutable;
	protected long[] relids;
	protected Node[] children;

	public boolean isMutable() {
		return mutable;
	}

	protected void seal() {
		assert (mutable);
		
		Iterator iter = getChildren();
		while( iter.hasNext() ) {
			Node child = iter.next();
			if( child.mutable )
				child.seal();
		}
		
		mutable = false;
	}

	public Node() {
		mutable = false;
		relids = new long[0];
		children = new Node[0];
	}

	protected Node(Node node) {
		mutable = true;
		relids = node.relids.clone();
		children = node.children.clone();
	}

	protected Node clone() {
		return new Node(this);
	}

	// must fail if the relid does not exist
	protected Node getChild(long relid) {
		for (int i = 0; i < relids.length; ++i) {
			if (relids[i] == relid)
				return children[i];
		}
		throw new IllegalArgumentException();
	}

	// must fail if the relid does not exist
	protected void setChild(long relid, Node node) {
		assert (isMutable());
		for (int i = 0; i < relids.length; ++i) {
			if (relids[i] == relid) {
				children[i] = node;
				return;
			}
		}
		throw new IllegalArgumentException();
	}

	public static abstract class Iterator {
		public abstract boolean hasNext();

		public abstract Node next();

		public abstract long currentRelid();

	};

	public Iterator getChildren() {
		return new Iterator() {
			protected int index = -1;

			public boolean hasNext() {
				return index + 1 < relids.length;
			}

			public Node next() {
				return children[++index];
			}

			public long currentRelid() {
				assert (hasNext());
				return relids[index];
			}
		};
	}

	public int getChildrenCount() {
		return relids.length;
	}
	
	public void addChild(long relid, Node child) {
		assert(isMutable());
		assert(child != null && !child.isMutable());
		
		for(int i = 0; i < relids.length; ++i)
			assert(relids[i] != relid);
		
		long[] or = relids;
		relids = new long[or.length + 1];
		System.arraycopy(or, 0, relids, 0, or.length);
		relids[or.length] = relid;
		
		Node[] oc = children;
		children = new Node[oc.length + 1];
		System.arraycopy(oc, 0, children, 0, oc.length);
		children[oc.length] = child;
	}
	
	public String toString() {
		String s = "mutable: " + mutable;
		s += ", ptr: " + Integer.toHexString(System.identityHashCode(this));
		s += ", children: {";
		for(int i = 0; i < relids.length; ++i) {
			if( i > 0 )
				s += ", ";
			
			s += relids[i] + ": {" + children[i] + "}"; 
		}
		s += "}";
		return s;
	}
}
