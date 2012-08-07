/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public final class Constant<Type> extends Promise<Type> {

	final Type value;

	public Constant(Type value) {
		assert (!(value instanceof Exception));

		this.value = value;
	}

	Type getValue() {
		return value;
	}

	void register(Listener listener) {
		listener.done();
	}
}
