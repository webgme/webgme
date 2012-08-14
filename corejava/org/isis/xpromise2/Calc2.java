/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise2;

public abstract class Calc2<Type, Arg0, Arg1> extends Promise<Type> {

	Receiver<Type> receiver;
	Receiver<Arg0> arg0;
	Receiver<Arg1> arg1;
	int missing = 3;

	public Calc2(Promise<Arg0> arg0, Promise<Arg1> arg1) {
		assert (arg0 != null && arg1 != null);

		this.arg0 = new Receiver<Arg0>(this, arg0);
		this.arg1 = new Receiver<Arg1>(this, arg1);

		arg0.register(this.arg0);
		arg1.register(this.arg1);
	}

	public abstract Promise<Type> calc(Arg0 arg0, Arg1 arg1);

	void fulfill() {
		try {
			Arg0 arg0 = this.arg0.get();
			Arg1 arg1 = this.arg1.get();
			Promise<Type> value = calc(arg0, arg1);
			receiver.defer(value);
		} catch (Exception error) {
			receiver.fail(error);
		}
	}

	void register(Receiver<Type> receiver) {
		assert (receiver != null);

		int m;
		synchronized (this) {
			assert (this.receiver == null);

			this.receiver = receiver;
			m = --missing;
		}

		if (m == 0) {
			fulfill();
		}
	}

	void done() {
		int m;
		synchronized (this) {
			m = --missing;
		}

		if (m == 0) {
			fulfill();
		}
	}

	boolean cancel() {
		boolean f;
		synchronized (this) {
			f = missing >= 0;
			if (f) {
				missing = -1;
			}
		}

		if (f) {
			arg0.cancel();
			arg1.cancel();
		}

		return f;
	}

	void fail(Exception error) {
		if (cancel()) {
			receiver.fail(error);
		}
	}
}
