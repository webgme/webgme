/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

final class Observer<Type> {
	private final Promise<?> parent;
	private Promise<Type> child;

	Observer(Promise<?> parent, Promise<Type> child) {
		assert (parent != null && child != null);

		this.parent = parent;
		this.child = child;

		child.setParent(this);
	}

	void setChild(Promise<Type> child) {
		assert (child != null);

		Promise<Type> old = null;
		synchronized (this) {
			old = this.child;
			if (old != null) {
				this.child = child;
			}
		}
		
		assert(!(old instanceof Constant));

		if (old == null)
			child.cancelPromise();
		else
			child.setParent(this);
	}

	void finished() {
		parent.finished();
	}
	
	Type getValue() throws Exception {
		return child.getValue();
	}
	
	void cancel() {
		Promise<Type> child;
		synchronized (this) {
			child = this.child;
			this.child = null;
		}
		if (child != null)
			child.cancelPromise();
	}
}
