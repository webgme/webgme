/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public class FutureCall2<Type, Arg0, Arg1> implements Promise<Type>, Consumer {

	private Object value;
	private int index;

	private short missing;

	private Object arg0;
	private Object arg1;

	@SuppressWarnings("unchecked")
	public FutureCall2(Promise<Arg0> promise0, Promise<Arg1> promise1)
			throws Exception {
		assert (promise0 != null && promise1 != null);

		value = this;
		index = -1;

		missing = 0;

		arg0 = promise0.getValue();
		if (arg0 instanceof Promise<?>)
			++missing;
		else if (arg0 instanceof Exception) {
			Exception reason = (Exception) arg0;
			promise1.cancel(reason);
			throw reason;
		}

		arg1 = promise1.getValue();
		if (arg1 instanceof Promise<?>)
			++missing;
		else if (arg1 instanceof Exception) {
			Exception reason = (Exception) arg0;
			promise0.cancel(reason);
			throw reason;
		}

		if (missing == 0) {
			try {
				value = execute((Arg0) arg0, (Arg1) arg1);
			} catch (Exception exception) {
				value = exception;
			}
		} else {
			value = this;

			if (arg0 instanceof Promise<?>)
				((Promise<?>) arg0).setConsumer(this, 0);

			if (arg1 instanceof Promise<?>)
				((Promise<?>) arg1).setConsumer(this, 1);
		}
	}

	private final synchronized int valid() {
		if( index == -1 ) {
			if( value instanceof Promise<?> && value != this )
				return -1;
		}
		else if( index >= 0 ) {
			return -1;
		}
		else 
			return -9;
		
		return 0;
	}

	@Override
	public final Object getValue() {
		assert (index < 0 && valid() == 0);

		return value;
	}

	@Override
	public void setConsumer(Consumer parent, int index) {
		assert (parent != null && index >= 0 && this.index < 0);
		assert (!(this.value instanceof Promise<?>) || this.value == this);

		Object value;
		synchronized (this) {
			value = this.value;
			if (value == this) {
				this.value = parent;
				this.index = index;
			}
		}

		if (value != this)
			parent.setArgument(index, value);
	}

	public void setValue(Object value) {
		assert (!(value instanceof Promise<?>));
		assert (this.value instanceof Consumer);

	}

	@Override
	public void setArgument(int index, Object argument) {
		assert (0 <= index && index <= 1);

		if (argument instanceof Exception) {
			Object value;
			synchronized (this) {

			}
			if (value == this) {
				synchronized (this) {
					if (value == this)
						value = argument;
					else {
						assert (value instanceof Consumer);
						((Consumer) value).setArgument(this.index, argument);
					}
				}
			} else {
				assert (value instanceof Consumer);
				((Consumer) value).setArgument(this.index, argument);
			}
		} else {
			if (index == 0)
				arg0 = argument;
			else
				arg1 = argument;

			if (argument instanceof Promise<?>)
				((Promise<?>) argument).setConsumer(this, index);
			else {
				int m;
				synchronized (this) {
					m = --missing;
				}
			}
		}
	}

	@Override
	public void cancel(Exception reason) {
		// TODO Auto-generated method stub

	}

	public Type execute(Arg0 arg0, Arg1 arg1) throws Exception {
		return null;
	}
}
