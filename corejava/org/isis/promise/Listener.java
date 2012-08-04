/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

abstract class Listener<Type> {
	Listener<Type> next;

	public abstract void fulfilled(Type value);

	public abstract void capture(Exception expection);
}
