package org.isis.webgme.core3;

import java.util.*;

public class Node {
	public Node parent;
	public List<Node> children;
	
	public Node basetype;
	public List<Node> subtypes;
	
	protected List<ClientNode> clients = new ArrayList<ClientNode>();
	
	public List<ClientNode> getClients() {
		return clients;
	}
	
	protected void removeClient(ClientNode client) {
		assert(clients.contains(client));
		clients.remove(client);
	}
	
	protected void addClient(ClientNode client) {
		assert(!clients.contains(client));
		clients.add(client);
	}
}
