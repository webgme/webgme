/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

import java.util.ArrayList;

public final class AsyncArrayList<Type> extends Promise<ArrayList<Type>> {

	private ArrayList<Promise<Type>> promiseArray = new ArrayList<Promise<Type>>();
	private ArrayList<Type> valueArray; 
	
	private int missing = 1;
	private Listener listener;

	public void add(Promise<Type> promise) {
		assert (promise != null);

		synchronized (this) {
			assert (listener == null);

			promiseArray.add(promise);
			++missing;
		}

		promise.register(this);
	}

	void done() {
		Listener listener = null;

		synchronized (this) {
			assert (missing != 0);
			if (--missing == 0) {
				listener = this.listener;
			}
		}

		if (listener != null) {
			valueArray = new ArrayList<Type>(promiseArray.size());

			int size = promiseArray.size(); 
			for(int i = 0; i < size; ++i) {
				valueArray.add(promiseArray.get(i).getValue());
			}
			
			promiseArray = null;
		}
	}

	void register(Listener listener) {
		assert (listener != null);

		synchronized (this) {
			assert (this.listener == null);
			assert (missing >= 1);

			this.listener = listener;
		}
	}

	ArrayList<Type> getValue() {
		return null;
	}

	void cancel() {

	}
}
