/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public abstract class FutureCall2<Type, Arg0, Arg1> implements Promise<Type> {
	private int missing;
	private Observer<Type> parent;
	private final Observer<Arg0> arg0;
	private final Observer<Arg1> arg1;

	public FutureCall2(Promise<Arg0> arg0, Promise<Arg1> arg1) {
		assert (arg0 != null && arg1 != null);

		this.missing = 3;
		this.arg0 = new Observer<Arg0>(this, arg0);
		this.arg1 = new Observer<Arg1>(this, arg1);
	}

	public final void setParent(Observer<Type> parent) {
		assert(parent != null);
		
		this.parent = parent;
		finished();
	}
	
	public final void finished() {
		int m;
		synchronized (this) {
			m = --missing;
		}

		assert (m >= 0);
		if (m == 0) {
			Promise<Type> value;
			try {
				value = execute(arg0.getValue(), arg1.getValue());
			} catch (Exception exception) {
				value = new Constant<Type>(exception);
			}
			parent.setChild(value);
		}
	}

	public abstract Promise<Type> execute(Arg0 arg1, Arg1 arg2);

	public final void cancelPromise() {
		arg0.cancel();
		arg1.cancel();
	}
	
	public Type getValue() throws Exception {
		throw new IllegalArgumentException("unresolved promise");
	}
}
