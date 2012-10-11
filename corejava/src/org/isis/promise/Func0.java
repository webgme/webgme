/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.concurrent.Executor;

public abstract class Func0<Type> {
	public abstract Promise<Type> call() throws Exception;

	public final Promise<Type> submit(final Executor executor) {
		assert (executor != null);

		Future<Type> future = new FutureCall0<Type>() {
			@Override
			public Promise<Type> execute() throws Exception {
				return Func0.this.call();
			}
		};

		// TODO: make this cancelable
		executor.execute(future);
		return future;
	}
}
