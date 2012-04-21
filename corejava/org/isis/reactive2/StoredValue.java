/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class StoredValue<RecordType extends Record, ValueType> extends
		PulledValue<RecordType, ValueType> {

	protected Record.Setter<RecordType, ValueType> setter;
	
	public StoredValue(Record.Setter<RecordType, ValueType> setter) {
		this.setter = setter;
	}

	public ValueType get(RecordType record) {
		return setter.get(record);
	}

	public void set(RecordType record, ValueType newValue) {
		ValueType oldValue = get(record);
		setter.set(record, newValue);
		signalModified(record, oldValue, newValue);
	}
}
