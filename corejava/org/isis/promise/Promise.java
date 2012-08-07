/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

abstract public class Promise<Type> {

	interface Listener {
		void done();
		void fail(Exception exception);
	};

	abstract Type getValue();
	
	abstract void register(Listener listener);
}
