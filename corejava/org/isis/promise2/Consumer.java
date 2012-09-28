/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public interface Consumer {
	/**
	 * This method is called by the child promise object where this consumer is
	 * registered as a parent. The index argument should be the same as the one
	 * passed to the <code>Promise.setParent</code> method. The argument should
	 * be a resolved value or exception, or a promise that has no parent yet.
	 * The type of the object and promise must be the of the type of the promise
	 * where this consumer is registered.
	 * 
	 * @param index
	 *            the index used to register this consumer
	 * @param argument
	 *            a resolved value or exception, or a promise without a parent
	 */
	void setArgument(int index, Object argument);
}
