/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise;

public abstract class FutureCall1<Type, Arg1> extends Promise<Type> implements
		Promise.Observer {

	private Promise<Arg1> arg1;

	public FutureCall1(Promise<Arg1> arg1) {
		assert (arg1 != null);

		this.arg1 = arg1;

		arg1.register(this);
	}

	public void resolved() {
		try {
			setValue(execute(arg1.getValue()));
		} catch (Exception e) {
			this.setError(e);
		}
	}

	public void cancel() {
		arg1.cancel();
	}

	public abstract Type execute(Arg1 value);
}
