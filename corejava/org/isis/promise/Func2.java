/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public class Func2<Type, Arg1, Arg2> extends Deferred<Type> implements
		Promise.Listener {

	private int missing = 3;
	private Promise<Arg1> arg1;
	private Promise<Arg2> arg2;

	public Func2(Promise<Arg1> arg1, Promise<Arg2> arg2) {
		this.arg1 = arg1;
		this.arg2 = arg2;

		arg1.register(this);
		arg2.register(this);

		done();
	}

	protected Type execute(Arg1 arg1, Arg2 arg2) throws Exception {
		return null;
	}

	public void done() {
		synchronized (this) {
			if (--missing != 0) {
				return;
			}
		}

		Arg1 val1 = arg1.getValue();
		Arg2 val2 = arg2.getValue();

		try {
			Type result = execute(val1, val2);
			fulfill(result);
		} catch (Exception exception) {
			reject(exception);
		}
	}

	void fail(Exception exception) {
		assert(exception != null);
		assert(missing != 0);
		
		synchronized (this) {
			if(missing <= 0) {
				return;
			}
			missing = -1;
		}
		
		reject(exception);
	}
}
