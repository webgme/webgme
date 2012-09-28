/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public class Constant<Type> implements Promise<Type> {
	private final Type value;

	public Constant(Type value) {
		assert (!(value instanceof Promise<?>));
		this.value = value;
	}

	@Override
	public Object getValue() {
		return value;
	}

	@Override
	public void setParent(Consumer parent, int index) {
		throw new IllegalStateException();
	}

	@Override
	public void cancel(Exception reason) {
	}
}
