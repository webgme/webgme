/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public interface Promise<Type> {
	public void setConsumer(int index, Consumer parent);
}
