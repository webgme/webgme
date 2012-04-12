/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.core.observable;

import java.util.*;

public class Class {

	protected ArrayList<Value> values = new ArrayList<Value>();
	protected int fieldCount = -1;

	public Field declareField() {
		assert(fieldCount == -1);
		
		Field field = new Field(this, values.size());
		values.add(field);
		
		return field;
	};

	public Value declareMethod(Unary.Function function, Value arg) {
		assert(fieldCount == -1);
		assert(arg.getDeclaringClass() == this);

		Unary unary = new Unary(this, function, arg);
		values.add(unary);
		
		return unary;
	}
	
	public Value declareMethod(Binary.Function function, Value arg1, Value arg2) {
		assert(fieldCount == -1);
		assert(arg1.getDeclaringClass() == this);
		assert(arg2.getDeclaringClass() == this);

		Binary binary = new Binary(this, function, arg1, arg2);
		values.add(binary);
		
		return binary;
	}
	
	public void seal() {
		fieldCount = values.size();
	}
	
	public List<Value> getDeclaredValues() {
		return values;
	}
	
	public boolean isSealed() {
		return fieldCount >= 0;
	}
	
	public Object[] newInstance() {
		return new Object[fieldCount];
	}
};
