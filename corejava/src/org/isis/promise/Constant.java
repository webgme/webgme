/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public final class Constant<Type> implements Promise<Type> {

	public static final Constant<Void> VOID = new Constant<Void>(null);
	public static final Constant<Integer> ZERO = new Constant<Integer>(0);
	public static final Constant<Object> NULL = new Constant<Object>(null);

	private Type value;

	public Constant(Type value) {
		this.value = value;
	}

	public Type getValue() {
		return value;
	}

	@Override
	public Constant<Type> getConstant() {
		return this;
	}

	@Override
	public void reject(Exception reason) {
	}

	@Override
	public void requestArgument(short index, Future<?> parent) {
		assert (false);
	}
}
