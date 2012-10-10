package org.isis.webgme.core2;

import java.util.*;

public class Client {
	
	// ------- queries

	private Collection<Query> queries = new HashSet<Query>();
	
	public Query getQuery(Node node) {
		Iterator<Query> iter = queries.iterator();
		while(iter.hasNext()) {
			Query query = iter.next();
			if( query.getNode() == node )
				return query;
		}
		return null;
	}

	public void addQuery(Query query) {
		assert( getQuery(query.getNode()) == null );
		queries.add(query);
	}

	public void removeQuery(Query query) {
		assert(queries.contains(query));
		queries.remove(query);
	}
}
