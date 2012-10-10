package org.isis.reactive4;

public class Client extends Table<Client> {

	public Field<Strings> name = declareField();
	
	public Subset<Query> queries = declareSubset();

}
