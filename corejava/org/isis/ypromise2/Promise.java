/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise2;

public abstract class Promise<Type> {

	protected abstract void setParent(Observer<Type> parent);
	
	protected abstract void finished();
	
	protected abstract void cancel();
}
