package org.isis.webgme.core;

import org.isis.webgme.reactive.*;

public class Query {
	protected Table table = new Table();
	protected Field<Object> data;
	protected Field<String[]> patterns;
	protected RefCount territory;

	public Query() {
		table = new Table();

		data = table.declareField(null);
		patterns = table.declareField(null);
		territory = table.declateCounter();

		Value<Boolean> selfPatterns = table.declareMethod(
				Unary.CONTAINS("self"), patterns);
		territory.declareBooleanSummand(selfPatterns);

		Value<Boolean> childrenPatterns = table.declareMethod(
				Unary.CONTAINS("children"), patterns);
		Value<Object[][]> childrenList = table.declareMethod(new Binary.Function<Object[][], Object, Boolean>() {
			public Object[][] compute(Object arg1, Boolean arg2) {
				if( ! arg2 )
					return null;
				
				return null;
			}
		}, data, childrenPatterns); 
		territory.declareBooleanSummand(childrenPatterns);
		territory.declareListSummand(childrenList);

		RefCount ancestorPatterns = table.declateCounter();
		ancestorPatterns.declareBooleanSummand(table.declareMethod(
				Unary.CONTAINS("ancestor"), patterns));
		territory.declareBooleanSummand(ancestorPatterns);

	}
}
