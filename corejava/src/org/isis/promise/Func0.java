/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.concurrent.ExecutorService;

public abstract class Func0<Type> {
	public abstract Promise<Type> call() throws Exception;

	public final Promise<Type> submit(final ExecutorService service) {
		assert (service != null);

		Future<Type> future = new FutureCall0<Type>() {
			@Override
			public Promise<Type> execute() throws Exception {
				return Func0.this.call();
			}

			@Override
			protected void rejectChildren(Exception error) {
			}
		};

		// TODO: make this cancelable
		service.submit(future);
		return future;
	}
}
