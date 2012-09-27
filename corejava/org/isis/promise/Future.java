/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public abstract class Future<Type> implements Promise<Type> {
	private int missing;
	private Observer<Type> parent;

	public Future(int missing) {
		assert (missing >= 1);
		this.missing = missing;
	}

	public final void setParent(Observer<Type> parent) {
		assert (parent != null);
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
				value = execute();
			} catch (Exception exception) {
				value = new Constant<Type>(exception);
			}
			if( parent != null )
				parent.setChild(value);
		}
	}

	protected abstract Promise<Type> execute() throws Exception;

	public final Type getValue() throws Exception {
		throw new IllegalArgumentException("unresolved promise");
	}
}
