/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.ypromise2;

final class Observer<Type> {
	private Promise<Type> promise;

	Observer(Promise<Type> promise) {
		assert (promise != null);

		this.promise = promise;
		promise.setObserver(this);
	}

	void replace(Promise<Type> promise) {
		assert (promise != null);

		boolean cancelled = false;
		synchronized (this) {
			if (this.promise != null)
				this.promise = promise;
			else
				cancelled = true;
		}

		if (cancelled)
			promise.cancel();
		else
			promise.setObserver(this);
	}

	void cancel() {
		Promise<Type> promise;
		synchronized (this) {
			promise = this.promise;
			this.promise = null;
		}
		if (promise != null)
			promise.cancel();
	}
}
