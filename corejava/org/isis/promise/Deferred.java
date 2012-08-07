/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public class Deferred<Type> extends Promise<Type> {

	private static final Object NOTHING = new Object();

	Object object = NOTHING;

	final void fulfill(Type value) {
		assert (!(value instanceof Listener) && !(value instanceof Exception));
		assert (object == NOTHING || object instanceof Listener);

		Listener listener;
		synchronized (this) {
			if (object == NOTHING) {
				object = value;
				return;
			}

			listener = (Listener) object;
			object = value;
		}

		listener.done();
	}

	final void reject(Exception exception) {
		assert (exception != null);
		assert (object == NOTHING || object instanceof Listener);

		Listener listener;
		synchronized (this) {
			if (object == NOTHING) {
				object = exception;
				return;
			}

			listener = (Listener) object;
			object = exception;
		}

		listener.fail(exception);
	}

	final void register(Listener listener) {
		assert (!(object instanceof Listener));

		Object value;
		synchronized (this) {
			if (object == NOTHING) {
				object = listener;
				return;
			}

			value = object;
		}

		if (value instanceof Exception) {
			listener.fail((Exception) value);
		} else {
			listener.done();
		}
	}

	@SuppressWarnings("unchecked")
	final Type getValue() {
		assert (object != NOTHING);
		assert (!(object instanceof Listener));
		assert (!(object instanceof Exception));

		return (Type) object;
	}
}
