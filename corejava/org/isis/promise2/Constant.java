/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public class Constant<Type> implements Promise<Type> {
	private final Type value;

	public Constant(Type value) {
		this.value = value;
	}

	@Override
	public void setConsumer(int index, Consumer parent) {
		parent.setValue(index, value);
	}
}
