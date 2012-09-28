/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.promise2;

public class FutureCall2<Type, Arg0, Arg1> extends Future<Type> {

	private int missing = 0;
	private Object arg0;
	private Object arg1;

	public FutureCall2(Promise<Arg0> promise0, Promise<Arg1> promise1)
			throws Exception {
		assert (promise0 != null && promise1 != null);

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

		if (missing == 0)
			calculateValue();
		else {
			if (arg0 instanceof Promise<?>)
				((Promise<?>) arg0).setParent(this, 0);

			if (arg1 instanceof Promise<?>)
				((Promise<?>) arg1).setParent(this, 1);
		}
	}

	@Override
	public void setArgument(int index, Object argument) {
		assert (0 <= index && index <= 1 && this.value == this && missing != 0);

		if (argument instanceof Exception) {
			// check if we have cancelled it already
			synchronized (this) {
				if (missing >= 0)
					missing = -1;
				else
					argument = null;
			}
			if (argument != null)
				setValue(argument);
		} else if (argument instanceof Promise<?>) {
			if (index == 0)
				arg0 = argument;
			else
				arg1 = argument;

			((Promise<?>) argument).setParent(this, index);
		} else {
			int m;
			synchronized (this) {
				m = --missing;

				if (index == 0)
					arg0 = argument;
				else
					arg1 = argument;

			}
			if (m == 0)
				calculateValue();
		}
	}

	@SuppressWarnings("unchecked")
	private void calculateValue() {
		Object value;
		try {
			value = execute((Arg0) arg0, (Arg1) arg1);
			if (value instanceof Promise<?>)
				value = ((Promise<?>) value).getValue();
		} catch (Exception reason) {
			value = reason;
		}

		setValue(value);
	}

	@Override
	public void cancel(Exception reason) {
	}

	public Promise<Type> execute(Arg0 arg0, Arg1 arg1) throws Exception {
		return null;
	}
}
