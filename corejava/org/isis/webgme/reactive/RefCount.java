/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

public class RefCount extends Value<Boolean> {

	protected int index;

	protected RefCount(Table table) {
		super(table);

		index = table.addDefValue(0);
	}

	protected final void increase(Object[] row) {
		int a = (Integer) row[index];
		assert (a >= 0);

		row[index] = a + 1;

		if (a == 0)
			notifyObservers(row, false, true);
	}

	protected final void decrease(Object[] row) {
		int a = (Integer) row[index];
		assert (a >= 1);

		row[index] = a - 1;

		if (a == 1)
			notifyObservers(row, true, false);
	}

	protected final Observer<Boolean> boolObserver = new Observer<Boolean>() {
		public final void modified(Object[] row, Boolean oldValue,
				Boolean newValue) {
			assert (oldValue != null && newValue != null && oldValue != newValue);

			if (newValue)
				increase(row);
			else
				decrease(row);
		}
	};

	public void declareBooleanSummand(Value<Boolean> value) {
		assert (!table.isSealed());
		assert (value.getDeclaringTable() == table);

		value.registerObserver(boolObserver);
	}

	protected final Observer<Integer> intObserver = new Observer<Integer>() {
		public final void modified(Object[] row, Integer oldValue,
				Integer newValue) {
			assert (oldValue != null && newValue != null && oldValue != newValue);

			if (oldValue == 0 && newValue >= 1)
				increase(row);
			else if (oldValue >= 1 && newValue == 0)
				decrease(row);
		}
	};

	public void declareIntegerSummand(Value<Integer> value) {
		assert (!table.isSealed());
		assert (value.getDeclaringTable() == table);
		value.registerObserver(intObserver);
	}

	protected final Observer<Object[][]> listObserver = new Observer<Object[][]>() {
		public final void modified(Object[] row, Object[][] oldValue,
				Object[][] newValue) {
			//TODO: it might be better to compare the lists and not access the embedded objects
			
			if (newValue != null) {
				for (Object[] r : newValue)
					increase(r);
			}

			if (oldValue != null) {
				for (Object[] r : oldValue)
					decrease(r);
			}
		}
	};

	public void declareListSummand(Value<Object[][]> value) {
		assert (!table.isSealed());
		assert (value.getDeclaringTable() == table);
		value.registerObserver(listObserver);
	}

	public final Boolean get(Object[] row) {
		return 1 <= (Integer) (row[index]);
	}
};
