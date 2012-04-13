package org.isis.webgme.core;

import org.isis.webgme.reactive.*;

public class Query {
	protected Branch branch;
	
	protected Table table;
	
	protected Value<Object[]> branchRecord;
	protected Value<Object> data;
	
	protected Field<String[]> patterns;
	protected RefCount territory;

	public Query(Branch branch) {
		table = new Table();

		branchRecord = table.declareField(null);
		data = branch.table.declareMethod(new Binary.Function<Object, Object[], Object>() {
			public Object compute(Object[] arg1, Object arg2) {
				return;
			}
		}, branch.query1Record, branch.data);
		
		patterns = table.declareField(null);
		territory = table.declareRefCount();

		Value<Boolean> selfPatterns = table.declareMethod(
				Unary.CONTAINS("self"), patterns);
		territory.declareBooleanSummand(selfPatterns);

		Value<Boolean> childrenPatterns = table.declareMethod(
				Unary.CONTAINS("children"), patterns);
		territory.declareBooleanSummand(childrenPatterns);
		Value<Object[][]> childrenList = table.declareMethod(new Binary.Function<Object[][], Object, Boolean>() {
			public Object[][] compute(Object arg1, Boolean arg2) {
				if( ! arg2 )
					return null;
				
				return null;
			}
		}, data, childrenPatterns); 
		territory.declareListSummand(childrenList);

		RefCount ancestorPatterns = table.declareRefCount();
		ancestorPatterns.declareBooleanSummand(table.declareMethod(
				Unary.CONTAINS("ancestor"), patterns));
		territory.declareBooleanSummand(ancestorPatterns);

	}
}
