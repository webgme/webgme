/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public abstract class Func2<Type, Arg0, Arg1> {
	public abstract Promise<Type> call(Arg0 arg0, Arg1 arg1) throws Exception;

	public final Promise<Type> call(Promise<Arg0> promise0,
			Promise<Arg1> promise1) throws Exception {

		Constant<Arg0> arg0 = promise0.getConstant();
		Constant<Arg1> arg1 = promise1.getConstant();

		if (arg0 != null && arg1 != null)
			return call(arg0.getValue(), arg1.getValue());

		final Func2<Type, Arg0, Arg1> that = this;
		Future<Type> future = new FutureCall2<Type, Arg0, Arg1>(promise0,
				promise1) {
			@Override
			public Promise<Type> execute(Arg0 arg0, Arg1 arg1) throws Exception {
				return that.call(arg0, arg1);
			}
		};

		future.run();
		return future;
	}

	public final Promise<Type> call(Promise<Arg0> promise0, final Arg1 arg1)
			throws Exception {

		Constant<Arg0> arg0 = promise0.getConstant();
		if (arg0 != null)
			return call(arg0.getValue(), arg1);

		final Func2<Type, Arg0, Arg1> that = this;
		Future<Type> future = new FutureCall1<Type, Arg0>(promise0) {
			@Override
			public Promise<Type> execute(Arg0 arg0) throws Exception {
				return that.call(arg0, arg1);
			}
		};

		future.run();
		return future;
	}

	public final Promise<Type> call(final Arg0 arg0, Promise<Arg1> promise1)
			throws Exception {

		Constant<Arg1> arg1 = promise1.getConstant();
		if (arg1 != null)
			return call(arg0, arg1.getValue());

		final Func2<Type, Arg0, Arg1> that = this;
		Future<Type> future = new FutureCall1<Type, Arg1>(promise1) {
			@Override
			public Promise<Type> execute(Arg1 arg1) throws Exception {
				return that.call(arg0, arg1);
			}
		};

		future.run();
		return future;
	}
}
