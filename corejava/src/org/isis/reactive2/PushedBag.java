/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.*;

public abstract class PushedBag<RecordType extends Record, ValueType> {

	public static interface Observer<RecordType, ValueType> {
		public void added(RecordType record, ValueType value);
		public void removed(RecordType record, ValueType value);
	};

	protected List<Observer<RecordType, ValueType>> observers = new ArrayList<Observer<RecordType, ValueType>>();

	public void registerObserver(Observer<RecordType, ValueType> observer) {
		assert (!observers.contains(observer));
		observers.add(observer);
	}

	protected void signalAdded(RecordType record, ValueType value) {
		for (Observer<RecordType, ValueType> observer : observers)
			observer.added(record, value);
	}

	protected void signalRemoved(RecordType record, ValueType value) {
		for (Observer<RecordType, ValueType> observer : observers)
			observer.added(record, value);
	}
};
