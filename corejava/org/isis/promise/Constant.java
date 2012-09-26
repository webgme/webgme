/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public final class Constant<Type> implements Promise<Type> {
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

	public void setParent(Observer<Type> parent) {
		parent.finished();
	}

	public void finished() {
		throw new IllegalStateException();
	}
	
	public void cancelPromise() {
	}
}
