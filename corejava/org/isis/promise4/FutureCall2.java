/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public abstract class FutureCall2<Type, Arg0, Arg1> extends Future<Type> {

	private Promise<Arg0> child0;
	private Promise<Arg1> child1;

	public FutureCall2(Promise<Arg0> arg0, Promise<Arg1> arg1) {
		assert (arg0 != null && arg1 != null);

		this.child0 = arg0;
		this.child1 = arg1;

		execute();
	}

	public abstract Promise<Type> execute(Arg0 arg0, Arg1 arg1)
			throws Exception;

	protected final void execute() {
		if (child0 instanceof Constant<?> && child1 instanceof Constant<?>) {
			try {
				Arg0 arg0 = ((Constant<Arg0>) child0).getValue();
				Arg1 arg1 = ((Constant<Arg1>) child1).getValue();
				Promise<Type> value = execute(arg0, arg1);
				resolve(value);
			} catch (Exception error) {
				reject(error);
			}
		}
	}

	@Override
	@SuppressWarnings("unchecked")
	protected final <Arg> void argumentResolved(Future<Arg> child,
			Promise<Arg> promise) {
		synchronized (this) {
			if (child == child0)
				child0 = (Promise<Arg0>) promise;
			else {
				assert (child == child1);
				child1 = (Promise<Arg1>) promise;
			}
		}

		execute();
	}

	@Override
	protected final void rejectChildren(Exception reason) {
		child0.reject(reason);
		child1.reject(reason);
	}
}
