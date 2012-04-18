package org.isis.webgme.core3;

import java.util.*;

public class Client {
	protected ArrayList<ClientNode> nodes = new ArrayList<ClientNode>();
	
	public List<ClientNode> getNodes() {
		return nodes;
	}
	
	protected void removeNode(ClientNode node) {
		assert(nodes.contains(node));
		nodes.remove(node);
	}

	protected void addNode(ClientNode node) {
		assert(!nodes.contains(node));
		nodes.add(node);
	}
}
