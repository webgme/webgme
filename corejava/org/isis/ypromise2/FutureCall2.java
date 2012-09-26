/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise2;

public abstract class FutureCall2<Type, Arg0, Arg1> extends Promise<Type> {
	private int missing;
	private Promise<Arg0> promise0;
	private Promise<Arg1> promise1;

	public FutureCall2(Promise<Arg0> promise0, Promise<Arg1> promise1) {
		assert (promise0 != null && promise1 != null);

		missing = 3;
		this.promise0 = promise0;
		this.promise1 = promise1;

		promise0.setParent(this, 0);
		promise1.setParent(this, 1);
	}

	protected final void fulfilled() {
		int m;
		synchronized (this) {
			m = --missing;
		}

		assert (m >= 0);
		if (m == 0) {
			try {
				Arg0 arg0 = promise0.getValue();
				Arg1 arg1 = promise1.getValue();
				Promise<Type> 

			} catch (Exception exception) {

			}
		}
	}

	public abstract Promise<Type> execute(Arg0 arg1, Arg1 arg2);

	public Type getValue() {
		throw new IllegalStateException();
	}

	protected void cancel() {
		promise0.cancel();
		promise1.cancel();
	}
}
