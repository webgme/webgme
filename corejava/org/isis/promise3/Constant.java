/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise3;

public class Constant<Type> implements Promise<Type> {
	private Object value;

	public Constant(Type value) {
		assert (!(value instanceof Exception));
		assert (!(value instanceof Promise<?>));
		this.value = value;
	}

	public Constant(Exception error) {
		assert (error != null);
		this.value = error;
	}

	public void setParent(Promise<?> parent, short index) {
		parent.setValue(index, value);
	}

	public void setValue(short index, Object value) {
		throw new IllegalStateException();
	}
}
