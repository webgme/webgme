/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.concurrent.Executor;

public abstract class Func1<Type, Arg0> {
	public abstract Promise<Type> call(Arg0 arg0) throws Exception;

	public final Promise<Type> call(Promise<Arg0> promise0) throws Exception {

		Constant<Arg0> arg0 = promise0.getConstant();
		if (arg0 != null)
			return call(arg0.getValue());

		final Func1<Type, Arg0> that = this;
		FutureCall1<Type, Arg0> future = new FutureCall1<Type, Arg0>(promise0) {
			@Override
			public Promise<Type> execute(Arg0 arg0) throws Exception {
				return that.call(arg0);
			}
		};

		future.run();
		return future;
	}

	public final Promise<Type> submit(final Executor executor, final Arg0 arg0) {
		assert (executor != null);

		FutureCall0<Type> future = new FutureCall0<Type>() {
			@Override
			public Promise<Type> execute() throws Exception {
				return Func1.this.call(arg0);
			}
		};

		// TODO: make this cancelable
		executor.execute(future);
		return future;
	}
}
