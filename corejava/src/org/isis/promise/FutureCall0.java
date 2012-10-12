/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

abstract class FutureCall0<Type> extends Future<Type> implements Runnable {
	@Override
	public final void run() {
		try {
			Promise<Type> value = execute();
			resolve(value);
		} catch (Exception error) {
			reject(error);
		}
	}

	public abstract Promise<Type> execute() throws Exception;

	@Override
	protected final <Arg> void argumentResolved(short index,
			Promise<Arg> promise) {
		throw new IllegalStateException();
	}

	@Override
	protected void rejectChildren(Exception reason) {
	}
}
