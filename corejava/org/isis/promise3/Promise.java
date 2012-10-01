/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise3;

public interface Promise<Type> {
	// parent is set once and cannot be changed
	public void setParent(Promise<?> parent, short index);
	
	// if value is a promise, then it must have no parent
	public void setValue(short index, Object value);
}
