package org.isis.webgme.core3;

import java.util.*;

public class ClientNode {
	
	protected static ArrayList<ClientNode> instances = new ArrayList<ClientNode>();
	
	protected Node node;

	public Node getNode() {
		return node;
	}
	
	public void setNode(Node node) {
		if(this.node != null)
			this.node.removeClient(this);
		
		this.node = node;
		if(node != null)
			node.addClient(this);
	}
	
	public Client client;
	
	public Client getClient() {
		return client;
	}
	
	public void setClient(Client client) {
		if(this.client != null)
			this.client.removeNode(this);
		
		this.client = client;
		if(client != null)
			client.addNode(this);
	}
	
	public String[] patterns;
	
	
}
