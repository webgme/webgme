/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise;

public abstract class FutureArray<Type> extends Promise<Type[]> implements
		Promise.Observer {

	int missing = 1;
	
	public FutureArray() {
	}

	public void add(Promise<Type> elem) {
	}
	
	public void resolved() {
	}

	public void cancel() {
	}
}
