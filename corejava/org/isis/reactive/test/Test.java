package org.isis.reactive.test;

import org.isis.reactive.*;

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
