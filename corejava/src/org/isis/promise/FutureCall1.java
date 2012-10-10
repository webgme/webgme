/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

abstract class FutureCall1<Type, Arg0> extends Future<Type> {

	private static final short INDEX0 = 0;
	private Promise<Arg0> promise0;

	public FutureCall1(Promise<Arg0> arg0) {
		assert (arg0 != null);
		this.promise0 = arg0;
	}

	@Override
	public final void run() {
		if (promise0 instanceof Constant<?>) {
			try {
				Arg0 arg0 = ((Constant<Arg0>) promise0).getValue();
				Promise<Type> value = execute(arg0);
				resolve(value);
			} catch (Exception error) {
				reject(error);
			}
		} else
			promise0.requestArgument(INDEX0, this);
	}

	public abstract Promise<Type> execute(Arg0 arg0) throws Exception;

	@Override
	@SuppressWarnings("unchecked")
	protected final <Arg> void argumentResolved(short index,
			Promise<Arg> promise) {
		assert (index == INDEX0 && promise != null);

		synchronized (this) {
			assert (promise0 != promise && !(promise0 instanceof Constant<?>));
			promise0 = (Promise<Arg0>) promise;
		}

		run();
	}

	@Override
	protected final void rejectChildren(Exception reason) {
		promise0.reject(reason);
	}
}
