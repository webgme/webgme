/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public abstract class FutureCall1<Type, Arg0> extends Future<Type> {

	private final Observer<Arg0> arg0;

	public FutureCall1(Promise<Arg0> arg0) {
		super(2);

		this.arg0 = new Observer<Arg0>(this, arg0);
	}

	protected final Promise<Type> execute() throws Exception {
		return execute(arg0.getValue());
	}

	public final void cancelPromise() {
		arg0.cancel();
	}

	public abstract Promise<Type> execute(Arg0 arg1) throws Exception;
}
