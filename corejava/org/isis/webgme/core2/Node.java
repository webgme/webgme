package org.isis.webgme.core2;

import java.util.*;

public class Node {
	// ------- parent

	private Node parent;
	
	public Node getParent() {
		return parent;
	}
	
	public void setParent(Node parent) {
		
		if( this.parent != null )
			this.parent.removeChild(this);
		
		this.parent = parent;
		
		if( parent != null )
			parent.addChild(this);

		Iterator<Query> iter = queries.iterator();
		while(iter.hasNext()) {
			Query query = iter.next();
			query.parentChanged(parent);
		}
	}
	
	// ------- children

	private List<Node> children = new ArrayList<Node>();

	public Iterator<Node> getChildren() {
		return children.iterator();
	}

	public void addChild(Node child) {
		assert(!children.contains(child));
		children.add(child);
		
		Iterator<Query> iter = queries.iterator();
		while(iter.hasNext()) {
			Query query = iter.next();
			query.childAdded(child);
		}
	}
	
	public void removeChild(Node child) {
		assert(children.contains(child));
		children.remove(child);

		Iterator<Query> iter = queries.iterator();
		while(iter.hasNext()) {
			Query query = iter.next();
			query.childRemoved(child);
		}
	}

	// ------- basetype
	
	protected Node basetype;

	public Node getBasetype() {
		return basetype;
	}
	
	public void setBasetype(Node basetype) {
		
		if( this.basetype != null )
			this.basetype.removeSubtype(this);
		
		this.basetype = basetype;
		
		if( basetype != null )
			basetype.addSubtype(this);
		
		Iterator<Query> iter = queries.iterator();
		while(iter.hasNext()) {
			Query query = iter.next();
			query.basetypeChanged(basetype);
		}
	}
	
	// ------- subtypes
	
	private List<Node> subtypes = new ArrayList<Node>();

	public Iterator<Node> getSubtypes() {
		return subtypes.iterator();
	}

	public void addSubtype(Node subtype) {
		assert(!subtypes.contains(subtype));
		subtypes.add(subtype);
	}
	
	public void removeSubtype(Node subtype) {
		assert(subtypes.contains(subtype));
		subtypes.remove(subtype);
	}

	// ------- storage

	private Storage storage;
	
	public Storage getStorage() {
		return storage;
	}

	// ------- queries
	
	private Collection<Query> queries = new ArrayList<Query>();

	public Query getQuery(Client client) {
		Iterator<Query> iter = queries.iterator();
		while(iter.hasNext()) {
			Query query = iter.next();
			if( query.getClient() == client )
				return query;
		}
		return null;
	}

	public void addQuery(Query query) {
		assert( getQuery(query.getClient()) == null );
		queries.add(query);
	}

	public void removeQuery(Query query) {
		assert(queries.contains(query));
		queries.remove(query);
	}

	// ------- load counters
	
	private int loadSelf;
	
	public void changeLoadSelf(int increment) {
		loadSelf += increment;
		assert(loadSelf >= 0);
		
		// TODO: load the parent
	}
	
	private int loadParent;
	
	public void changeLoadParent(int increment) {
		loadParent += increment;
		assert(loadParent >= 0);
		
		// TODO: load the parent
	}

	private int loadChildren;
	
	public void changeLoadChildren(int increment) {
		loadChildren += increment;
		assert(loadChildren >= 0);
		
		// TODO: load the parent
	}
	
	private int loadBasetype;
	
	public void changeLoadBasetype(int increment) {
		loadBasetype += increment;
		assert(loadBasetype >= 0);
		
		// TODO: load the parent
	}
	
	private int loadSubtypes;
	
	public void changeLoadSubtypes(int increment) {
		loadSubtypes += increment;
		assert(loadSubtypes >= 0);
		
		// TODO: load the parent
	}
}
