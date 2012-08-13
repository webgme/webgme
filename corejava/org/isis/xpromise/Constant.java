/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise;


public final class Constant<Type> extends Promise<Type> {
	private Type value;

	public Constant(Type value) {
		this.value = value;
	}

	Type getValue() {
		return value;
	}

	void register(PromiseBase<Type> waiter) {
		waiter.done(value);
	}
}
