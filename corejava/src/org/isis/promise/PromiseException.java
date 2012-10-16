/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

final class PromiseException<Type> implements Promise<Type> {
	private Exception value;

	PromiseException(Exception value) {
		assert (value != null);
		this.value = value;
	}

	@Override
	public Constant<Type> getConstant() throws Exception {
		throw value;
	}

	@Override
	public void reject(Exception reason) {
	}

	@Override
	public void requestArgument(int index, Future<?> parent) {
		assert (false);
	}
}
