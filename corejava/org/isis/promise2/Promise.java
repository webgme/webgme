/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public interface Promise<Type> {
	/**
	 * Implementation should return either a resolved value of type Type, or
	 * throw an exception, or call parent.setValue or parent.setError.
	 * 
	 * @param parent
	 *            the consumer waiting for the resolution of the promise
	 * @param index
	 *            this value that should be passed to parent.setValue
	 * 
	 * @return
	 */
	public void setConsumer(Consumer parent, int index);

	/**
	 * This method should either return the resolved value of type Type, 
	 * throw a resolved exception or return this promise object. It should
	 * never block the calling thread.
	 * 
	 * @return the resolved value or this promise
	 */
	public Object getValue();
	
	public void cancel(Exception reason);
}
