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

	private static ThreadGroup THREAD_GROUP = new ThreadGroup("workers") {
		public void uncaughtException(Thread t, Throwable e) {
			synchronized (System.err) {
				System.err.println("Unhandled exception in thread "
						+ t.getName());
				e.printStackTrace(System.err);
			}
		}
	};

	public static Executor NEW_THREAD_EXECUTOR = new Executor() {
		@Override
		public void execute(Runnable runnable) {
			Thread thread = new Thread(THREAD_GROUP, runnable);
			thread.start();
		}
	};

	private static ThreadFactory DAEMON_THREAD_FACTORY = new ThreadFactory() {
		@Override
		public Thread newThread(Runnable runnable) {
			Thread thread = new Thread(THREAD_GROUP, runnable);
			thread.setDaemon(true);
			return thread;
		}
	};

	public static Executor THREAD_POOL_EXECUTOR = new ThreadPoolExecutor(10,
			10, 1, TimeUnit.SECONDS, new LinkedBlockingQueue<Runnable>(),
			DAEMON_THREAD_FACTORY);

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
			protected <Arg> void argumentResolved(int index,
					Promise<Arg> promise) {
				assert (promise != null);

				if (promise instanceof Constant<?>) {
					synchronized (this) {
						result = promise;
						this.notifyAll();
					}
				} else
					promise.requestArgument((short) 0, this);
			}

			@Override
			protected void rejectChildren(Exception error) {
				assert (error != null);

				synchronized (this) {
					result = error;
					this.notifyAll();
				}
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
