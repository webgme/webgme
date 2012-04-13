package org.isis.webgme.test;

import org.isis.webgme.reactive.*;
import org.isis.webgme.reactive.Table;

public class Test {
	public static void main(String[] args) {
		Table table = new Table();

		Field<Integer> field = table.declareField(0);

		Value<Boolean> nonzero = table.declareMethod(Unary.NONZERO, field);
		Field<Boolean> hihi = table.declareField(false);

		Value<Boolean> combined = table
				.declareMethod(Binary.AND, nonzero, hihi);

		table.seal();

		Object[] row = table.newInstance();
		field.set(row, 1);
		hihi.set(row, true);
		System.out.println(combined.get(row));
	};
}
