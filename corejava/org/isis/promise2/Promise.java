/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

abstract public class Promise<Type> extends Listener {

	abstract void register(Listener listener);

	abstract Type getValue();
	
	abstract void cancel();
}
