/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise2;

final class Receiver<Type> {

	private static final Object CANCELLED = new Object();
	
	private final Promise<?> parent;
	private Object value;

	Receiver(Promise<?> parent, Promise<Type> value) {
		assert (parent != null && value != null);

		this.parent = parent;
		this.value = value;
	}

	void cancel() {
		Object oldValue;
		
		synchronized (this) {
			oldValue = this.value;
			this.value = CANCELLED;
		}

		if (oldValue instanceof Promise) {
			((Promise<?>) oldValue).cancel();
		}
	}

	void done(Type value) {
		assert (!(value instanceof Exception));
		assert (!(value instanceof Promise));

		Object oldValue;
		synchronized (this) {
			if ((oldValue = this.value) != CANCELLED) {
				this.value = value;
			}
		}

		if (oldValue != CANCELLED) {
			assert (oldValue instanceof Promise);
			parent.done();
		}
	}

	void fail(Exception error) {
		assert (error != null);

		Object oldValue;
		synchronized (this) {
			oldValue = this.value;
			this.value = CANCELLED;
		}

		if (oldValue != CANCELLED) {
			assert (oldValue instanceof Promise);
			parent.fail(error);
		}
	}

	void defer(Promise<Type> value) {
		assert(value != null);
		
		synchronized (this) {
			assert(this.value instanceof Promise || this.value == CANCELLED);
			
			if( this.value != CANCELLED ) {
				this.value = value;
				value = null; 
			}
		}
	}
	
	@SuppressWarnings("unchecked")
	Type get() {
		assert (!(value instanceof Exception));
		assert (!(value instanceof Promise));

		// not synchronized, happens-before relationship is already established
		return (Type) value;
	};
}
