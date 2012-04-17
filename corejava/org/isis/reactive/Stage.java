/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive;

import java.util.*;

@SuppressWarnings("unchecked")
public class Stage<Type> extends Value<Type> {

	protected int index;
	protected Value<Type> value;

	protected ArrayList<Object[]> changed = new ArrayList<Object[]>();

	protected Stage(Table table, Value<Type> value) {
		super(table);

		index = table.addDefValue(unmodified);
		this.value = value;

		value.registerObserver(observer);
	}

	protected static final Object unmodified = new Object();

	public Type get(Object[] row) {
		Object backup = row[index];

		if (backup == unmodified)
			return value.get(row);

		return (Type) backup;
	}

	protected final Observer<Type> observer = new Observer<Type>() {
		public final void modified(Object[] row, Type oldValue, Type newValue) {
			Object backup = row[index];
			if (backup == unmodified) {
				changed.add(row);
				row[index] = oldValue;
			}
		}
	};

	public final boolean isDirty() {
		return !changed.isEmpty();
	}

	public final void commit() {
		for (;;) {
			int last = changed.size() - 1;
			if (last < 0)
				return;

			Object[] row = changed.remove(last);
			Type oldValue = (Type) row[index];

			assert (oldValue != unmodified);
			row[index] = unmodified;

			Type newValue = value.get(row);

			notifyObservers(row, oldValue, newValue);
		}
	}
};
