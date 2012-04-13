package org.isis.webgme.core;

import org.isis.webgme.reactive.*;
import org.isis.webgme.reactive.Table;

public class Query {
	protected Table table = new Table();
	protected Field<Object> data;
	protected Field<String[]> patterns;
	protected Counter territory;

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

		Counter ancestorPatterns = table.declateCounter();
		ancestorPatterns.declareBooleanSummand(table.declareMethod(
				Unary.CONTAINS("ancestor"), patterns));
		territory.declareBooleanSummand(table.declareMethod(Unary.NONZERO,
				ancestorPatterns));

	}
}
