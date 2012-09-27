/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public abstract class FutureCall2<Type, Arg0, Arg1> extends Future<Type> {

	private final Observer<Arg0> arg0;
	private final Observer<Arg1> arg1;

	public FutureCall2(Promise<Arg0> arg0, Promise<Arg1> arg1) {
		super(3);

		this.arg0 = new Observer<Arg0>(this, arg0);
		this.arg1 = new Observer<Arg1>(this, arg1);
	}

	protected final Promise<Type> execute() throws Exception {
		return execute(arg0.getValue(), arg1.getValue());
	}

	public final void cancelPromise() {
		arg0.cancel();
		arg1.cancel();
	}

	public abstract Promise<Type> execute(Arg0 arg1, Arg1 arg2)
			throws Exception;
}
