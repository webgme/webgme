/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.concurrent.*;

public class Executor {

	public static <Type> Type obtain(Promise<Type> promise) throws Exception {
		final class Waiter implements Promise<Void> {
			boolean finished = false;

			public void setParent(Observer<Void> parent) {
			}

			public Void getValue() throws Exception {
				return null;
			}

			public synchronized void finished() {
				finished = true;
				this.notify();
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

	private ExecutorService service = Executors.newCachedThreadPool();

}
