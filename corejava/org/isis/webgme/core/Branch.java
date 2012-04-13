package org.isis.webgme.core;

import org.isis.webgme.reactive.*;

public class Branch {
	public Table table;

	public Field<Object> data;
	public RefCount territory;

	public Field<Object[]> query1Record;
	public Field<Object[]> query2Record;
	
	public Branch() {
		table = new Table();

		data = table.declareField(null);
		territory = table.declareRefCount();
		
		query1Record = table.declareField(null);
		query2Record = table.declareField(null);
	}
}
