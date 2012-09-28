/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public interface Promise<Type> {
	/**
	 * This method should either return the resolved value of type Type, a
	 * resolved exception or return a promise object of type Type that has no
	 * parent yet. This method should never block or do any computation, just
	 * return the currently cached value.
	 * 
	 * @return a resolved value or exception, or a promise without a parent
	 */
	public Object getValue();

	public void setParent(Consumer parent, int index);

	public void cancel(Exception reason);
}
