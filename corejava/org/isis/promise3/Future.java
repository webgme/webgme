/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise3;

public final class Future<Type, Arg> {
	private final static int STATE_UNCALCULATED = 0x00;

	// calculate is called
	private final static int STATE_SET_PROMISE = 0x01;
	private final static int STATE_SET_VALUE = 0x03;
	private final static int STATE_SET_ERROR = 0x07;

	// parent is set
	private final static int STATE_GET_VALUE = 0x10;
	private final static int STATE_GET_ARGUMENT = 0x20;

	private int state;
	private Object object;

	public Future(Future<Arg, ?> argument) {
		assert (argument != null);

		state = STATE_UNCALCULATED;
		object = null;

		argument.getArgument(this);
	}

	@SuppressWarnings("unchecked")
	public void getArgument(Future<?, Type> parent) {
		assert (parent != null);

		int state;
		Object object;

		synchronized (this) {
			state = this.state;
			this.state = state | STATE_GET_ARGUMENT;

			object = this.object;
			this.object = parent;
		}

		if (state == STATE_SET_VALUE)
			parent.setArgument((Type) object);
		else if (state == STATE_SET_PROMISE)
			;
		else if (state == STATE_SET_ERROR)
			parent.setError((Exception) object);
		else
			assert (state == STATE_UNCALCULATED);
	}

	@SuppressWarnings("unchecked")
	public void getValue(Future<Type, ?> parent) {
		assert (parent != null);

		int state;
		Object object;

		synchronized (this) {
			state = this.state;
			this.state = state | STATE_GET_VALUE;

			object = this.object;
			this.object = parent;
		}

		if (state == STATE_SET_VALUE)
			parent.setValue((Type) object);
		else if (state == STATE_SET_PROMISE)
			;
		else if (state == STATE_SET_ERROR)
			parent.setError((Exception) object);
		else
			assert (state == STATE_UNCALCULATED);
	}

	public Object calculate(Arg arg) throws Exception {
		return null;
	}

	@SuppressWarnings("unchecked")
	public void setArgument(Arg arg) {

		try {
			Object value = calculate(arg);
			if (value instanceof Future<?, ?>)
				setFuture((Future<Type, ?>) value);
			else
				setValue((Type) value);
		} catch (Exception error) {
			setError(error);
		}
	}

	@SuppressWarnings("unchecked")
	public void setError(Exception error) {
		assert (error != null);

		int state;
		Object object;

		synchronized (this) {
			state = this.state;
			this.state = state | STATE_SET_ERROR;

			object = this.object;
			this.object = error;
		}

		if (state == STATE_GET_ARGUMENT)
			((Future<?, Type>) object).setError(error);
		else if (state == STATE_GET_VALUE)
			((Future<Type, ?>) object).setError(error);
	}

	public void setValue(Type value) {
	}

	public void setFuture(Future<Type, ?> value) {
		assert (value != null);

	}
}
