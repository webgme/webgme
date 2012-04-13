package org.isis.webgme.test;

import org.isis.webgme.reactive.*;
import org.isis.webgme.reactive.Class;

public class Test
{
	public static void main(String[] args) {
		Class klass = new Class();

		Field<Integer> field = klass.declareField(0);

		Value<Boolean> nonzero = klass.declareMethod(Unary.NONZERO, field);
		Field<Boolean> hihi = klass.declareField(false);
		
		Value<Boolean> combined = klass.declareMethod(Binary.AND, nonzero, hihi);
		
		klass.seal();
		
		Object[] object = klass.newInstance();
		field.set(object, 1);
		hihi.set(object, true);
		System.out.println(combined.get(object));
	};
}
