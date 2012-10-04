/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public abstract class FutureCall1<Type, Arg0> extends Future<Type> {

	private static final short INDEX0 = 0;
	private Promise<Arg0> promise0;

	public FutureCall1() {
	}

	protected void setArguments(Promise<Arg0> arg0) {
		assert (arg0 != null);
		arg0.requestArgument(INDEX0, this);
	}

	// TODO: start computation when parent is set (otherwise we cannot set
	// fields in derived classes before calculation is started)
	public FutureCall1(Promise<Arg0> arg0) {
		setArguments(arg0);
	}

	public abstract Promise<Type> execute(Arg0 arg0) throws Exception;

	protected final void execute() {
		try {
			Arg0 arg0 = ((Constant<Arg0>) promise0).getValue();
			Promise<Type> value = execute(arg0);
			resolve(value);
		} catch (Exception error) {
			reject(error);
		}
	}

	@Override
	@SuppressWarnings("unchecked")
	protected final <Arg> void argumentResolved(short index,
			Promise<Arg> promise) {
		assert (index == INDEX0 && promise != null);

		synchronized (this) {
			assert (promise0 != promise && !(promise0 instanceof Constant<?>));
			promise0 = (Promise<Arg0>) promise;
		}

		if (promise instanceof Constant<?>)
			execute();
		else
			promise.requestArgument(index, this);
	}

	@Override
	protected final void rejectChildren(Exception reason) {
		promise0.reject(reason);
	}
}
