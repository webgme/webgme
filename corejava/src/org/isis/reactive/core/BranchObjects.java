package org.isis.reactive.core;

import org.isis.reactive.*;

public class BranchObjects {

	public static Table table;

	public static Field<Object> data;
	public static RefCount territory;
	
	protected static void init() {
		table = new Table();
		data = table.declareField(null);
		territory = table.declareRefCount();
	};
}
