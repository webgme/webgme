/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class PushedInverse<RecordType extends Record, ValueType extends Record>
		extends PushedBag<RecordType, ValueType> {
	
	protected PushedValue<ValueType, RecordType> pointer;

	public PushedInverse(PushedValue<ValueType, RecordType> pointer) {
		this.pointer = pointer;
		pointer.registerObserver(new PointerObserver());
	}

	protected class PointerObserver implements
			PushedValue.Observer<ValueType, RecordType> {
		public void modified(ValueType record, RecordType oldValue,
				RecordType newValue) {

			if (oldValue != null)
				signalRemoved(oldValue, record);

			if (newValue != null)
				signalAdded(newValue, record);
		}
	};
};
