/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.concurrent.*;

public class Executor {

	public static <Type> Type obtain(Promise<Type> promise) throws Exception {
		assert (promise != null);

		final class Waiter extends Future<Void> {
			Waiter() {
				super(1);
			}

			boolean finished = false;

			public synchronized Promise<Void> execute() {
				finished = true;
				this.notify();
				return null;
			}

			public void cancelPromise() {
			}
		}

		Waiter waiter = new Waiter();
		Observer<Type> observer = new Observer<Type>(waiter, promise);

		synchronized (waiter) {
			if (!waiter.finished)
				waiter.wait();
		}

		return observer.getValue();
	}

	private static ExecutorService service = new ThreadPoolExecutor(0,
			Integer.MAX_VALUE, 1, TimeUnit.SECONDS,
			new SynchronousQueue<Runnable>()) {
		protected void beforeExecute(Thread thread, Runnable command) {
			System.out.println("before " + System.identityHashCode(command)
					+ " " + thread.getId());
		}

		protected void afterExecute(Runnable command, Throwable exception) {
			System.out.println("after  " + System.identityHashCode(command)
					+ (exception != null ? exception.toString() : ""));
		}
	};

	public static void execute(Runnable command) {
		service.execute(command);
	}
}
