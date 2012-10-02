/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise3;

public class Constant<Type> implements Promise<Type> {
	private Type value;

	public Constant(Type value) {
		this.value = value;
	}

	@Override
	public void setParent(Observer<Type> parent) {
		parent.finished(value);
	}

	@Override
	public void cancel(Exception error) {
		throw new IllegalStateException();
	}
}
