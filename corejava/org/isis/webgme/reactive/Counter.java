/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

public class Counter extends Value<Integer> {

	protected int index;

	protected Counter(Table table) {
		super(table);

		index = table.addDefValue(0);
	}

	protected final Observer<Integer> intObserver = new Observer<Integer>() {
		public final void modified(Object[] row, Integer oldValue,
				Integer newValue) {
			assert (oldValue != null && newValue != null && oldValue != newValue);

			int oldCounter = (Integer) (row[index]);
			int newCounter = oldCounter - oldValue + newValue;

			row[index] = newCounter;
			notifyObservers(row, oldCounter, newCounter);
		}
	};

	public void declareIntegerSummand(Value<Integer> value) {
		assert (!table.isSealed());
		assert (value.getDeclaringClass() == table);
		value.registerObserver(intObserver);
	}

	protected final Observer<Boolean> boolObserver = new Observer<Boolean>() {
		public final void modified(Object[] row, Boolean oldValue,
				Boolean newValue) {
			assert (oldValue != null && newValue != null && oldValue != newValue);

			int oldCounter = (Integer) (row[index]);
			int newCounter = oldCounter;

			if (oldValue == true)
				newCounter -= 1;
			else if (newValue == true)
				newCounter += 1;

			row[index] = newCounter;
			notifyObservers(row, oldCounter, newCounter);
		}
	};

	public void declareBooleanSummand(Value<Boolean> value) {
		assert (!table.isSealed());
		assert (value.getDeclaringClass() == table);

		value.registerObserver(boolObserver);
	}

	public final Integer get(Object[] row) {
		return (Integer) (row[index]);
	}
};
