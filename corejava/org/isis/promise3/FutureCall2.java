/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise3;

public class FutureCall2<Type, Arg0, Arg1> implements Promise<Type> {

	private Object value = this;

	private short index;
	private Promise<?> parent = null;

	private short missing;
	private Object arg0;
	private Object arg1;

	public FutureCall2(Promise<Arg0> arg0, Promise<Arg1> arg1) {

		this.missing = 2;
		this.arg0 = arg0;
		this.arg1 = arg1;

		arg0.setParent(this, (short) 1);
		arg1.setParent(this, (short) 2);
	}

	public void setParent(Promise<?> parent, short index) {
		assert (parent != null && this.parent == null);

		Object value;
		synchronized (this) {
			this.parent = parent;
			this.index = index;

			value = this.value;
		}

		if (value != this)
			parent.setValue(index, value);
	}

	public void setValue(short index, Object value) {
		if (index >= 0) {
			assert (missing > 0);

			if (index == 0)
				arg0 = value;
			else {
				assert (index == 1);
				arg1 = value;
			}

			if (value instanceof Promise<?>) {
				((Promise<?>) value).setParent(this, index);
			} else {
				short m;
				synchronized (this) {
					m = --missing;
				}

				if (m == 0) {
					value = calculate();
					index = -1;
				}
			}
		}
		if (index < 0) {
			assert (missing == 0);

			Promise<?> parent;
			synchronized (this) {
				parent = this.parent;
				this.value = value;
			}

			if (parent != null)
				parent.setValue(this.index, value);
			else if (value instanceof Promise<?>)
				((Promise<?>) value).setParent(this, (short) -1);
		}
	}

	@SuppressWarnings("unchecked")
	private Promise<Type> calculate() {
		Promise<Type> value;
		try {
			Arg0 arg0 = (Arg0) this.arg0;
			Arg1 arg1 = (Arg1) this.arg1;
			value = calculate(arg0, arg1);
		} catch (Exception exception) {
			value = new Constant<Type>(exception);
		}
		return value;
	}

	public Promise<Type> calculate(Arg0 arg0, Arg1 arg1) {
		return null;
	}
}
