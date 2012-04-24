package org.isis.webgme.core2;

import java.util.*;

public class Query {

	public Query(Node node, Client client) {
		assert (client != null);
		assert (node != null);

		this.client = client;
		this.node = node;

		client.addQuery(this);
		node.addQuery(this);
	}

	public void destroy() {
		assert (client != null);
		assert (node != null);

		assert (loadParent == 0);
		assert (loadChildren == 0);
		assert (loadBasetype == 0);
		assert (loadSubtypes == 0);
		assert (loadAncestors == 0);

		client.removeQuery(this);
		node.removeQuery(this);

		client = null;
		node = null;
	}

	public void parentChanged(Node parentNode) {
		if (parent != null) {
			if (loadParent > 0)
				parent.changeLoadSelf(-1);

			if (loadAncestors > 0)
				parent.changeLoadAncestors(-1);
		}

		if (parentNode != null) {
			parent = parentNode.getQuery(client);
			if (parent == null)
				parent = new Query(parentNode, client);

			if (loadParent > 0)
				parent.changeLoadSelf(1);

			if (loadAncestors > 0)
				parent.changeLoadAncestors(1);
		} else
			parent = null;
	}

	public void childAdded(Node childNode) {
		if (loadChildren > 0) {
			Query child = childNode.getQuery(client);
			if (child == null)
				child = new Query(childNode, client);

			child.changeLoadSelf(1);
		}
	}

	public void childRemoved(Node childNode) {
		if (loadChildren > 0) {
			Query child = childNode.getQuery(client);
			assert(child != null);

			child.changeLoadSelf(-1);
		}
	}

	// ------- client

	private Client client;

	public Client getClient() {
		return client;
	}

	// ------- node

	private Node node;

	public Node getNode() {
		return node;
	}

	// ------- parent

	private Query parent;

	public Query getParent() {
		return parent;
	}

	private class ChildIterator implements Iterator<Query> {
		protected Client client;
		protected Iterator<Node> iterator;
		
		public ChildIterator(Client client, Iterator<Node> iterator) {
			this.client = client;
			this.iterator = iterator;
		}
		
		public boolean hasNext() {
			return iterator.hasNext();
		}

		public Query next() {
			Node node = iterator.next();
			assert(node != null);
			
			Query query = node.getQuery(client);
			if( query == null )
				query = new Query(node, client);
			
			return query;
		}

		public void remove() {
			throw new UnsupportedOperationException();
		}
	};
	
	public Iterator<Query> getChildren() {
		return new ChildIterator(client, node.getChildren());
	}
	
	// ------- basetype

	private Query basetype;

	public Query getBasetype() {
		return basetype;
	}

	public void basetypeChanged(Node node) {
		if (loadAncestors > 0) {
			if (basetype != null)
				basetype.changeLoadAncestors(-1);

			if (node == null)
				basetype = null;
			else {
				basetype = node.getQuery(client);
				if (basetype == null)
					basetype = new Query(node, client);

				basetype.changeLoadAncestors(1);
			}
		} else
			assert (basetype == null);
	}

	// ------- load counters

	private int loadSelf;

	public void changeLoadSelf(int increment) {
		loadSelf += increment;
		assert (loadSelf >= 0);

		node.changeLoadSelf(increment);
	}

	private int loadParent;

	public void changeLoadParent(int increment) {
		int old = loadParent;

		loadParent += increment;
		assert (loadParent >= 0);

		int change = (loadParent > 0 ? 1 : 0) - (old > 0 ? 1 : 0);
		if (change != 0) {
			changeLoadSelf(change);

			if (parent != null)
				parent.changeLoadSelf(change);
		}

		node.changeLoadParent(increment);
	}

	private int loadChildren;

	public void changeLoadChildren(int increment) {
		int old = loadParent;

		loadChildren += increment;
		assert (loadChildren >= 0);

		node.changeLoadChildren(increment);

		int change = (loadChildren > 0 ? 1 : 0) - (old > 0 ? 1 : 0);
		if (change != 0) {
			changeLoadSelf(change);

			Iterator<Query> iter = getChildren();
			while (iter.hasNext()) {
				Query child = iter.next();
				child.changeLoadSelf(change);
			}
		}
	}

	private int loadBasetype;

	public void changeLoadBasetype(int increment) {
		loadBasetype += increment;
		assert (loadBasetype >= 0);

		node.changeLoadBasetype(increment);
	}

	private int loadSubtypes;

	public void changeLoadSubtypes(int increment) {
		loadSubtypes += increment;
		assert (loadSubtypes >= 0);

		node.changeLoadSubtypes(increment);
	}

	private int loadAncestors;

	public void changeLoadAncestors(int increment) {
		int old = loadAncestors;

		loadAncestors += increment;
		assert (loadAncestors >= 0);

		int change = (loadAncestors > 0 ? 1 : 0) - (old > 0 ? 1 : 0);
		if (change != 0) {
			changeLoadParent(change);
			changeLoadBasetype(change);

			if (parent != null)
				parent.changeLoadAncestors(change);
			if (basetype != null)
				basetype.changeLoadAncestors(change);
		}
	}
}
