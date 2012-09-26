/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public final class Constant<Type> extends Promise<Type> {
	private Object value;
	
	public Constant(Type value) {
		this.value = value;
	}

	public Constant(Exception value) {
		assert(value instanceof Exception);
		this.value = value;
	}

	@SuppressWarnings("unchecked")
	public Type getValue() throws Exception {
		if( value instanceof Exception )
			throw (Exception)value;
		else
			return (Type)value;
	}

	protected void setParent(Observer<Type> parent) {
		parent.finished();
	}

	protected void finished() {
		throw new IllegalStateException();
	}
	
	protected void cancel() {
	}
}
