/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public abstract class Future<Type> implements Promise<Type>, Consumer {

	protected Object value = this;

	private Consumer parent = null;
	private int index;

	@Override
	public final Object getValue() {
		assert (parent == null);
		return value;
	}

	@Override
	public final void setParent(Consumer parent, int index) {
		assert (this.parent == null && parent != null);

		Object value;
		synchronized (this) {
			value = this.value;
			this.parent = parent;
			this.index = index;
		}

		if (value != this)
			parent.setArgument(index, value);
	}

	public final void setValue(Object value) {
		assert (this.value == this && value != this);

		Consumer parent;
		int index;
		synchronized (this) {
			parent = this.parent;
			index = this.index;
			this.value = value;
		}

		if (parent != null)
			parent.setArgument(index, value);
	}
}
