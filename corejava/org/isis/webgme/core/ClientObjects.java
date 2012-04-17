package org.isis.webgme.core;

import org.isis.reactive.*;

public class ClientObjects {

	public static Table table;

	public static Field<String[]> patterns;

	public static Value<Object> data;
	public static RefCount territory;

	protected static void init() {
		table = new Table();

		Pointer branchObject = table.declarePointer(BranchObjects.table);
		Value<Object> branchData = branchObject.declareImport(BranchObjects.data);

		territory = table.declareRefCount();
		data = table.declareMethod(Binary.IF(), territory, branchData);

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

		
	};
}
