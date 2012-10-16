/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

import java.lang.reflect.Array;
import java.util.*;
import java.util.concurrent.atomic.*;

public final class FutureArray<Type> extends Future<Type[]> {

	AtomicInteger missing;
	ArrayList<Promise<Type>> list;
	Class<Type> type;

	public FutureArray(Class<Type> type) {
		assert (type != null);

		this.type = type;
		list = new ArrayList<Promise<Type>>();
	}

	public void add(Promise<Type> promise) throws Exception {
		assert (missing == null && promise != null);
		list.add(promise);
	}

	public Promise<Type[]> seal() throws Exception {
		assert (missing == null);

		missing = new AtomicInteger(1);
		int size = list.size();

		for (int i = 0; i < size; ++i) {
			Promise<Type> promise = list.get(i);
			Constant<Type> constant = promise.getConstant();
			if (constant != null)
				list.set(i, constant);
			else {
				missing.incrementAndGet();
				promise.requestArgument(i, this);
			}
		}

		if (missing.decrementAndGet() == 0)
			done();

		return this;
	}

	@SuppressWarnings("unchecked")
	protected void done() throws Exception {

		int size = list.size();

		Type[] result = (Type[]) Array.newInstance(type, size);
		for (int i = 0; i < size; ++i) {
			Constant<Type> constant = list.get(i).getConstant();
			result[i] = constant.getValue();
		}

		resolve(new Constant<Type[]>(result));
	}

	@Override
	@SuppressWarnings("unchecked")
	protected final <Arg> void argumentResolved(int index,
			Promise<Arg> promise) {
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

		throw new UnsupportedOperationException();
	}
}
