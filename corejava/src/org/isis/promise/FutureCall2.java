/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

abstract class FutureCall2<Type, Arg0, Arg1> extends Future<Type> {

	private static final short INDEX0 = 0;
	private static final short INDEX1 = 1;

	private Promise<Arg0> promise0;
	private Promise<Arg1> promise1;

	public FutureCall2(Promise<Arg0> arg0, Promise<Arg1> arg1) {
		assert (arg0 != null && arg1 != null);

		promise0 = arg0;
		promise1 = arg1;
	}

	@Override
	public void run() {
		if (promise0 instanceof Constant<?>) {
			if (promise1 instanceof Constant<?>)
				execute();
			else
				promise1.requestArgument(INDEX1, this);
		} else {
			promise0.requestArgument(INDEX0, this);
			if (promise1 instanceof Constant<?>)
				;
			else
				promise1.requestArgument(INDEX1, this);
		}
	}

	public abstract Promise<Type> execute(Arg0 arg0, Arg1 arg1)
			throws Exception;

	protected void execute() {
		try {
			Arg0 arg0 = ((Constant<Arg0>) promise0).getValue();
			Arg1 arg1 = ((Constant<Arg1>) promise1).getValue();
			Promise<Type> value = execute(arg0, arg1);
			resolve(value);
		} catch (Exception error) {
			reject(error);
		}
	}

	@Override
	@SuppressWarnings("unchecked")
	protected final <Arg> void argumentResolved(short index,
			Promise<Arg> promise) {
		assert (index >= INDEX0 && index <= INDEX1 && promise != null);

		synchronized (this) {
			if (index == INDEX0) {
				assert (promise0 != promise && !(promise0 instanceof Constant<?>));
				promise0 = (Promise<Arg0>) promise;
			} else {
				assert (promise1 != promise && !(promise1 instanceof Constant<?>));
				promise1 = (Promise<Arg1>) promise;
			}
		}

		if (!(promise instanceof Constant<?>))
			promise.requestArgument(index, this);
		else if (promise0 instanceof Constant<?>
				&& promise1 instanceof Constant<?>)
			execute();
	}

	@Override
	protected final void rejectChildren(Exception reason) {
		promise0.reject(reason);
		promise1.reject(reason);
	}
}
