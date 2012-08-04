/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public class Promise<Type> {

	@SuppressWarnings("rawtypes")
	static final Listener FULFILLED = new Listener() {
		public void fulfilled(Object value) {
			throw new RuntimeException("promise value is fulfilled twice");
		}

		public void capture(Exception expection) {
			throw new RuntimeException("promise error is raised twice");
		}
	};

	public Promise() {
	}

	public Promise(Type value) {
	}

	Type value;
	Listener<Type> listeners;

	public void register(Listener<Type> listener) {
		assert (listener != null && listener.next == null);
		assert (listeners != FULFILLED);

		listener.next = listeners;
		listeners = listener;
	}

	@SuppressWarnings("unchecked")
	void fulfill(Type value) {
		assert (listeners != FULFILLED);

		while (listeners != null) {
			listeners.fulfilled(value);
			listeners = listeners.next;
		}

		listeners = FULFILLED;
	}

	@SuppressWarnings("unchecked")
	void raise(Exception expection) {
		assert (listeners != FULFILLED);

		while (listeners != null) {
			listeners.capture(expection);
			listeners = listeners.next;
		}

		listeners = FULFILLED;
	}
}
