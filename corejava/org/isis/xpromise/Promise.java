/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise;

public abstract class Promise<Type> {
	
	abstract void register(Observer parent);

	public abstract void cancel();
	
	abstract Type getValue();
}
