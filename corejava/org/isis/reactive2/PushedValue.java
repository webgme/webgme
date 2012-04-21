/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.*;

public abstract class PushedValue<RecordType extends Record, ValueType> {

	public static interface Observer<RecordType, ValueType> {
		public void modified(RecordType record, ValueType oldValue,
				ValueType newValue);
	};

	protected List<Observer<RecordType, ValueType>> observers = new ArrayList<Observer<RecordType, ValueType>>();

	public void registerObserver(Observer<RecordType, ValueType> observer) {
		assert (!observers.contains(observer));
		observers.add(observer);
	}

	protected boolean hasChanged(ValueType oldValue, ValueType newValue) {
		return oldValue != newValue
				&& (oldValue == null || !oldValue.equals(newValue));
	};

	protected void signalModified(RecordType record, ValueType oldValue,
			ValueType newValue) {
//		assert (newValue == get(record));

		if (hasChanged(oldValue, newValue)) {
			for (Observer<RecordType, ValueType> observer : observers) {
				observer.modified(record, oldValue, newValue);
			}
		}
	}
};
