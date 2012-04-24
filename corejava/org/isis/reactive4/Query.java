package org.isis.reactive4;

public class Query extends Table<Query> {

	public Field<Node> node = declareField();
	public Field<Client> client = declareField();
	
	public Field<Query> parent = declareField();
	public Subset<Query> children = declareSubset();

	public Field<Booleans> loadSelf = declareField();
	public Field<Booleans> loadParent = declareField();
	public Field<Booleans> loadChildren = declareField();
	
}
