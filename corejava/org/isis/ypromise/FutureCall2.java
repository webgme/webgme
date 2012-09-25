/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise;

public abstract class FutureCall2<Type, Arg1, Arg2> extends Promise<Type>
		implements Promise.Observer {

	private int missing = 2;
	private Promise<Arg1> arg1;
	private Promise<Arg2> arg2;

	public FutureCall2(Promise<Arg1> arg1, Promise<Arg2> arg2) {
		assert (arg1 != null && arg2 != null);

		this.arg1 = arg1;
		this.arg2 = arg2;

		arg1.register(this);
		arg2.register(this);
	}

	public void resolved() {
		boolean finished;
		synchronized (this) {
			finished = --missing == 0;
		}

		if (finished) {
			try {
				setValue(execute(arg1.getValue(), arg2.getValue()));
			} catch (Exception e) {
				this.setError(e);
			}
		}
	}

	public void cancel() {
		arg1.cancel();
		arg2.cancel();
	}

	public abstract Type execute(Arg1 value, Arg2 value2);
}
