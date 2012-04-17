/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public abstract class ReField<ObservableType extends ReObservable,ValueType> extends ReValue<ObservableType,ValueType> {

	public abstract ValueType get(ObservableType observable);

	protected abstract void rawSet(ObservableType observable, ValueType value);

	public void set(ObservableType observable, ValueType newValue) {
		ValueType oldValue = get(observable);
		rawSet(observable, newValue);

		notifyObservers(observable, oldValue, newValue);
	}
}
