/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise2;

public abstract class Promise<Type> {

	protected Promise<?> parent;
	protected int index;

	protected final void setParent(Promise<?> parent, int index) {
		assert (parent != null);

		this.parent = parent;
		this.index = index;

		fulfilled();
	}

	protected void setObserver(Observer<Type> observer) {
	}
	
	public abstract Type getValue() throws Exception;
	
	protected abstract void fulfilled();

	protected abstract void cancel();
}
