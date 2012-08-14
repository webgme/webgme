/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise2;

public abstract class Promise<Type> {
	abstract boolean cancel();
	abstract void done();
	abstract void fail(Exception error);
	abstract void register(Receiver<Type> receiver);
}
