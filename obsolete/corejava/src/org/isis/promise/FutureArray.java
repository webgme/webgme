/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.util.*;
import java.util.concurrent.atomic.*;

final class FutureArray<Type> extends Future<List<Type>> {

	AtomicInteger missing;
	ArrayList<Promise<Type>> list;

	public FutureArray(Collection<Promise<Type>> collection) throws Exception {
		missing = new AtomicInteger(1);
		list = new ArrayList<Promise<Type>>(collection.size());

		Iterator<Promise<Type>> iter = collection.iterator();
		while (iter.hasNext()) {
			Promise<Type> promise = iter.next();

			Constant<Type> constant = promise.getConstant();
			if (constant != null)
				list.add(constant);
			else {
				missing.incrementAndGet();
				list.add(promise);
				promise.requestArgument(list.size() - 1, this);
			}
		}

		if (missing.decrementAndGet() == 0)
			done();
	}

	protected void done() throws Exception {

		ArrayList<Type> result = new ArrayList<Type>(list.size());
		Iterator<Promise<Type>> iter = list.iterator();

		while (iter.hasNext()) {
			Promise<Type> promise = iter.next();
			Constant<Type> constant = promise.getConstant();
			result.add(constant.getValue());
		}

		list = null;
		resolve(new Constant<List<Type>>(result));
	}

	@Override
	@SuppressWarnings("unchecked")
	protected final <Arg> void argumentResolved(int index, Promise<Arg> promise) {
		assert (missing != null);

		list.set(index, (Promise<Type>) promise);

		if (promise instanceof Constant<?>) {
			if (missing.decrementAndGet() == 0)
				try {
					done();
				} catch (Exception exception) {
					reject(exception);
				}
		} else
			promise.requestArgument(index, this);
	}

	@Override
	protected final void rejectChildren(Exception reason) {
		assert (missing != null);

		System.err.println("not yet supported");
		// throw new UnsupportedOperationException();
	}
}
