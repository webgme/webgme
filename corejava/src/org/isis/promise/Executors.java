/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.concurrent.*;

public class Executors {
	public static Executor DIRECT_EXECUTOR = new Executor() {
		@Override
		public void execute(Runnable runnable) {
			runnable.run();
		}
	};

	public static Executor NEW_THREAD_EXECUTOR = new Executor() {
		@Override
		public void execute(Runnable runnable) {
			Thread thread = new Thread(runnable);
			thread.start();
		}
	};

	@SuppressWarnings("unchecked")
	public static <Type> Type obtain(final Promise<Type> promise)
			throws Exception {
		assert (promise != null);

		Constant<Type> c = promise.getConstant();
		if (c != null)
			return c.getValue();

		final class Waiter extends Future<Void> {

			Object result = null;

			public void run() {
				promise.requestArgument((short) 0, this);
			}

			@Override
			protected synchronized <Arg> void argumentResolved(short index,
					Promise<Arg> promise) {
				assert (promise != null);

				if (promise instanceof Constant<?>) {
					result = promise;
					this.notifyAll();
				} else
					promise.requestArgument((short) 0, this);
			}

			@Override
			protected synchronized void rejectChildren(Exception error) {
				assert (error != null);

				result = error;
				this.notifyAll();
			}
		}

		Waiter waiter = new Waiter();
		waiter.run();

		synchronized (waiter) {
			if (waiter.result == null)
				waiter.wait();
		}

		if (waiter.result instanceof Constant<?>)
			return ((Constant<Type>) waiter.result).getValue();

		throw new Exception((Exception) waiter.result);
	}
}
