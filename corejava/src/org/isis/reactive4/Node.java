package org.isis.reactive4;

public class Node extends Table<Node> {

	public Field<Node> parent = declareField();
	public Subset<Node> children = declareSubset();

	public Subset<Query> queries = declareSubset();
	
	public Field<Booleans> loadSelf = declareField();
	public Field<Booleans> loadParent = declareField();
	public Field<Booleans> loadChildren = declareField();

	public void init() {
		loadSelf.set(current.get(queries).or());
	}
}
