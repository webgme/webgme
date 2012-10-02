/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise3;

public final class Future<Type, Arg> implements Promise<Type>, Observer<Object> {

	private final static int STATE_UNCALCULATED = 0; // Promise<Arg>
	private final static int STATE_CALCULATED = 1; // Promise<Type>
	private final static int STATE_VALUE_SET = 2; // Type
	private final static int STATE_FAILED = 3; // Exception
	private final static int STATE_CANCELLED = 4; // Exception

	private int state;
	private Object object;
	private Observer<Type> parent;

	@SuppressWarnings("unchecked")
	public Future(Promise<Arg> argument) {
		assert (argument != null);

		state = STATE_UNCALCULATED;
		object = argument;
		parent = null;

		argument.setParent((Observer<Arg>) this);
	}

	@Override
	@SuppressWarnings("unchecked")
	public void setParent(Observer<Type> parent) {
		assert (parent != null);

		int state;
		synchronized (this) {
			this.parent = parent;
			state = this.state;
		}

		if (state == STATE_VALUE_SET)
			parent.finished((Type) object);
		else if (state == STATE_CALCULATED && parent instanceof Future<?, ?>)
			;
		else if (state == STATE_FAILED)
			parent.failed((Exception) object);
		else
			assert (state == STATE_UNCALCULATED);
	}

	@Override
	@SuppressWarnings("unchecked")
	public void finished(Object value) {
		if (state == STATE_UNCALCULATED) {
			Promise<Type> result;

			try {
				result = calculate((Arg) value);
			} catch (Exception error) {
				failed(error);
				return;
			}

			state = STATE_CALCULATED;
			value = result;
		} else {
			Observer<Type> parent = null;

			synchronized (this) {
				assert (this.state == STATE_CALCULATED || this.state == STATE_CANCELLED);

				if (this.state < STATE_VALUE_SET) {
					this.state = STATE_VALUE_SET;
					this.object = value;
					parent = this.parent;
				}
			}

			if (parent != null)
				parent.finished((Type) value);
		}
	}

	@Override
	public void cancel(Exception error) {
		int state;
		Object object;

		synchronized (this) {
			state = this.state;
			object = this.object;

			if (state < STATE_CANCELLED) {
				this.state = STATE_CANCELLED;
				this.object = error;
			}
		}

		if (state == STATE_UNCALCULATED || state == STATE_CALCULATED)
			((Promise<?>) object).cancel(error);
	}

	@Override
	public void failed(Exception error) {
		assert (error != null);

		Observer<Type> parent = null;

		synchronized (this) {
			assert (this.state == STATE_UNCALCULATED
					|| this.state == STATE_CALCULATED || this.state == STATE_CANCELLED);

			if (this.state < STATE_FAILED) {
				this.state = STATE_FAILED;
				this.object = error;

				parent = this.parent;
			}
		}

		if (parent != null)
			parent.failed(error);
	}

	Promise<Type> calculate(Arg arg) throws Exception {
		return null;
	}
}
