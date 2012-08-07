/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public final class Constant<Type> extends Promise<Type> {
	final Type value;

	public Constant(Type value) {
		this.value = value;
	}

	void register(Listener listener) {
		listener.done();
	}

	Type getValue() {
		return value;
	}

	void cancel() {
	}

	void done() {
	}
}
