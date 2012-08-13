/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.xpromise2;

public final class Promise extends PromiseBase {

	private static final class PromiseNothing extends PromiseBase {
		void cancel() {
		}

		void setObserver(Promise observer) {
			throw new IllegalStateException();
		}

		void setValue(Object value) {
		}
	};

	private static final PromiseBase UNDEFINED = new PromiseNothing();
	private static final PromiseBase CANCELLED = new PromiseNothing();

	protected Promise observer = null;
	protected Object value = UNDEFINED;

	void cancel() {
		Object value;

		synchronized (this) {
			value = this.value;
			this.value = CANCELLED;
			this.observer = null;
		}

		if (value instanceof PromiseBase) {
			((PromiseBase) value).cancel();
		}
	}

	void setObserver(Promise observer) {
		assert (this != UNDEFINED && this != CANCELLED);
		assert (observer != null && observer != UNDEFINED && observer != CANCELLED);

		Object value;

		synchronized (this) {
			assert (this.observer == null);

			value = this.value;
			this.observer = observer;
		}

		if (!(value instanceof Promise)) {
			observer.setValue(value);
		}
	}

	void setValue(Object value) {
		Promise observer;

		synchronized (this) {
			assert (this.value instanceof Promise);

			observer = this.observer;
			this.value = value;
		}

		if (value instanceof PromiseBase) {
			((PromiseBase) value).setObserver(this);
		} else if (observer != null) {
			observer.setValue(value);
		}
	}
}
