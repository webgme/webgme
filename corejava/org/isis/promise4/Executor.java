/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public class Executor {
	@SuppressWarnings("unchecked")
	public static <Type> Type obtain(final Promise<Type> promise) throws Exception {
		assert (promise != null);

		if (promise instanceof Constant<?>)
			return ((Constant<Type>) promise).getValue();

		final class Waiter extends Future<Void> {

			Object result = null;

			public void run() {
				promise.requestArgument((short) 0, this);
			}

			@Override
			protected synchronized <Arg> void argumentResolved(short index,
					Promise<Arg> promise) {
				assert (promise != null);
				
				System.out.println("xxxx");
				
				if (promise instanceof Constant<?>) {
					result = promise;
					this.notifyAll();
				}
				else
					promise.requestArgument((short)0, this);
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

		throw (Exception) waiter.result;
	}
}
