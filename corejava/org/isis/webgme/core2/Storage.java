package org.isis.webgme.core2;

import java.util.*;

public class Storage {
	protected byte[] sha1;
	
	// ------- nodes
	
	private Collection<Node> nodes = new ArrayList<Node>();
	
	public void addNode(Node node) {
		assert( !nodes.contains(node) );
		nodes.add(node);
	}

	public void removeQuery(Node node) {
		assert( nodes.contains(node) );
		nodes.remove(node);
	}
	
}
