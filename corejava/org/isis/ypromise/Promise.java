/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise;

public class Promise<Type> {
	private static final Observer UNRESOLVED = new Observer() {
		public void resolved() {
			throw new IllegalStateException();
		}
	};

	protected interface Observer {
		void resolved();
	}

	private Object value;

	public Promise() {
		value = UNRESOLVED;
	}
	
	public Promise(Type value) {
		assert (!(value instanceof Exception || value instanceof Observer));
		this.value = value;
	}

	public Promise(Exception error) {
		assert(error != null);
		this.value = error;
	}
	
	public final boolean isResolved() {
		assert (value == UNRESOLVED || !(value instanceof Observer));
		return value != UNRESOLVED;
	}

	@SuppressWarnings("unchecked")
	public final Type getValue() throws Exception {
		assert (!(value instanceof Observer));

		if (value instanceof Exception)
			throw (Exception) value;
		else
			return (Type) value;
	}

	public final void setValue(Type value) {
		assert (!(value instanceof Exception || value instanceof Observer));

		setObject(value);
	}

	public final void setError(Exception error) {
		assert (error != null);
		setObject(error);
	}

	private final void setObject(Object obj) {
		Observer observer;
		synchronized (this) {
			assert (value instanceof Observer);
			observer = (Observer) value;
			value = obj;
		}

		if (observer != UNRESOLVED)
			observer.resolved();
	}

	public final void register(Observer parent) {
		assert (parent != null);

		boolean unresolved;
		synchronized (this) {
			unresolved = value == UNRESOLVED;
			if (unresolved) {
				value = parent;
			}
		}

		if (!unresolved) {
			parent.resolved();
		}
	}

	public void cancel() {
	}
}
