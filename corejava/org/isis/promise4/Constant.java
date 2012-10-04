/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public final class Constant<Type> implements Promise<Type> {
	private Type value;

	Constant(Type value) {
		this.value = value;
	}

	public Type getValue() {
		return value;
	}

	@Override
	public Promise<Type> getPromise() {
		return this;
	}

	@Override
	public void reject(Exception reason) {
	}

	@Override
	public void requestArgument(short index, Future<?> parent) {
		parent.argumentResolved(index, this);
	}

	@Override
	public void requestForwarding(Future<Type> parent) {
	}
}
