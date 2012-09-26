/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public class Printer<Type> extends Promise<Type> {
	private int missing;
	private final Observer<Type> observer;

	public Printer(Promise<Type> promise) {
		assert (promise != null);

		missing = 2;
		observer = new Observer<Type>(this, promise);
	}

	protected final void setParent(Observer<Type> parent) {
		throw new IllegalStateException();
	}

	protected final void finished() {
		int m;
		synchronized (this) {
			m = --missing;
		}

		assert (m >= 0);
		if (m == 0) {
			try {
				Type value = observer.getValue();
				System.out.println(value);
			} catch (Exception exception) {
				exception.printStackTrace();
			}
		}
	}

	public void print() {
		assert (missing >= 1);
		finished();
	}

	protected final void cancel() {
		observer.cancel();
	}
}
