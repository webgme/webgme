/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

@SuppressWarnings("unchecked")
public class Field<Type> extends Value<Type> {

	protected int index;
	
	protected Field(Class klass, Type defValue) {
		super(klass);
		
		index = klass.addDefValue(defValue);
	}

	public final Type get(Object[] object) {
		return (Type)(object[index]);
	}
	
	public final void set(Object[] object, Type value) {
		Type oldValue = (Type)object[index];
		object[index] = value;

		notifyObservers(object, oldValue, value);
	}
};
