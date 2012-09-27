/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public abstract class BlockingCall<Type> implements Promise<Type>, Runnable {

	private static final Object NOTHING = new Object();
	
	private Observer<Type> parent;
	private Object value;

	public BlockingCall() {
		value = NOTHING;
		Executor.execute(this);
	}

	public void setParent(Observer<Type> parent) {
		assert (parent != null);

		Object value;
		synchronized(this) {
			this.parent = parent;
			value = this.value;
		}
		
		if( value != NOTHING )
			parent.finished();
	}

	public void finished() {
	}

	public void cancelPromise() {
	}

	public abstract Type execute() throws Exception;

	public void run() {
		try {
			value = execute();
		} catch (Exception exception) {
			value = exception;
		}
		
		Observer<Type> parent;
		synchronized(this) {
			parent = this.parent;
		}

		if( parent != null )
			parent.finished();
	}

	@SuppressWarnings("unchecked")
	public Type getValue() throws Exception {
		if (value instanceof Exception)
			throw (Exception) value;
		else
			return (Type) value;
	}
}
