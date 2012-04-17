/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

@SuppressWarnings("unchecked")
public abstract class ReValue<ObservableType extends ReObservable, ValueType> {

	public static interface Observer<ObservableType, ValueType> {
		public void modified(ObservableType observable, ValueType oldValue, ValueType newValue);
	};

	public abstract ValueType get(ObservableType observable);

	protected Observer<ObservableType,ValueType>[] observers = (Observer<ObservableType,ValueType>[]) new Observer[0];

	public void registerObserver(Observer<ObservableType,ValueType> observer) {
		Observer<ObservableType,ValueType>[] old = observers;

		observers = (Observer<ObservableType,ValueType>[]) new Observer[old.length + 1];
		System.arraycopy(old, 0, observers, 0, old.length);

		observers[old.length] = observer;
	}

	protected boolean hasChanged(ValueType oldValue, ValueType newValue) {
		return oldValue != newValue
				&& (oldValue == null || !oldValue.equals(newValue));
	};

	protected void notifyObservers(ObservableType observable, ValueType oldValue,
			ValueType newValue) {
		assert (newValue == get(observable));

		if (hasChanged(oldValue, newValue)) {
			for (Observer<ObservableType,ValueType> observer : observers) {
				observer.modified(observable, oldValue, newValue);
			}
		}
	}
};
