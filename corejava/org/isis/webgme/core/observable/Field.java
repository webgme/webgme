/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.core.observable;

public class Field extends Value {

	protected int index;
	
	public Field(Class klass, int index) {
		super(klass);
		this.index = index;
	}

	public Object get(Object[] object) {
		return object[index];
	}
	
	public void set(Object[] object, Object value) {
		object[index] = value;
	}
};
