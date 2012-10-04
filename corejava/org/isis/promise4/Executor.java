/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise4;

public class Executor {
	@SuppressWarnings("unchecked")
	public static <Type> Type obtain(Promise<Type> promise) throws Exception {
		assert (promise != null);

		if (promise instanceof Constant<?>)
			return ((Constant<Type>) promise).getValue();

		final class Waiter extends Future<Void> {

			Object result = null;

			Waiter(Promise<Type> promise) {
				promise.requestArgument((short) 0, this);
			}

			@Override
			protected synchronized <Arg> void argumentResolved(short index,
					Promise<Arg> promise) {
				assert (promise != null);

				if (promise instanceof Constant<?>) {
					result = promise;
					this.notifyAll();
				}
			}

			@Override
			protected synchronized void rejectChildren(Exception error) {
				assert (error != null);

				result = error;
				this.notifyAll();
			}
		}

		Waiter waiter = new Waiter(promise);

		synchronized (waiter) {
			if (waiter.result == null)
				waiter.wait();
		}

		if (waiter.result instanceof Constant<?>)
			return ((Constant<Type>) waiter.result).getValue();

		throw (Exception) waiter.result;
	}
}
