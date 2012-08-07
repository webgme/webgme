/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise;

public class Deferred2 {

	Deferred2 parent;
	Deferred2 firstChild;
	Deferred2 nextChild;

	private final static Object NOTHING = new Object();
	private Object value = NOTHING;

	Object getValue() {
		assert (value != NOTHING);
		return value;
	}

	void setParent(Deferred2 parent) {
		assert (parent == null && nextChild == null);

		Object v;

		synchronized (parent) {
			this.parent = parent;
			nextChild = parent.firstChild;
			parent.firstChild = this;
			v = value;
		}

		if (v != NOTHING) {
			parent.done();
		}
	}

	void setValue(Object val) {
		assert (value == NOTHING);
	}

	void done() {
	}
}
