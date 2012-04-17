/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive;

@SuppressWarnings("unchecked")
public abstract class Value<Type> {

	public interface Observer<Type> {
		public void modified(Object[] row, Type oldValue, Type newValue);
	};

	protected final Table table;

	protected Observer<Type>[] observers = (Observer<Type>[]) new Observer[0];

	protected Value(Table table) {
		this.table = table;
	}

	public Table getDeclaringTable() {
		return table;
	}

	public void registerObserver(Observer<Type> observer) {
		Observer<Type>[] old = observers;

		observers = (Observer<Type>[]) new Observer[old.length + 1];
		System.arraycopy(old, 0, observers, 0, old.length);

		observers[old.length] = observer;
	}

	public abstract Type get(Object[] row);

	public final boolean hasChanged(Type oldValue, Type newValue) {
		return oldValue != newValue
				&& (oldValue == null || !oldValue.equals(newValue));
	};

	protected final void notifyObservers(Object[] row, Type oldValue,
			Type newValue) {
		assert (newValue == get(row));

		if (hasChanged(oldValue, newValue)) {
			for (Observer<Type> observer : observers) {
				observer.modified(row, oldValue, newValue);
			}
		}
	}
};
