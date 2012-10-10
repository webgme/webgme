/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class StoredCounter<RecordType extends Record> extends PulledValue<RecordType, Integer> {

	protected Record.Setter<RecordType, Integer> field;

	public StoredCounter(Record.Setter<RecordType, Integer> field) {
		this.field = field;
	}
	
	public Integer get(RecordType record) {
		return field.get(record);
	}

	public void increase(RecordType record, int increment) {
		int value = field.get(record);
		field.set(record, value + increment);
		signalModified(record, value, value + increment);
	}
	
	protected class IntegerSetObserver implements PushedBag.Observer<RecordType, Integer> {
		public void added(RecordType record, Integer value) {
			increase(record, value);
		}

		public void removed(RecordType record, Integer value) {
			increase(record, -value);
		}
	};

	public void registerIntegerSummand(PushedBag<RecordType, Integer> sublist) {
		sublist.registerObserver(new IntegerSetObserver());
	}

	protected class IntegerValueObserver implements PushedValue.Observer<RecordType, Integer> {
		public void modified(RecordType record, Integer oldValue, Integer newValue) {
			increase(record, newValue - oldValue);
		}
	};
	
	public void registerIntegerSummand(PushedValue<RecordType, Integer> subvalue) {
		subvalue.registerObserver(new IntegerValueObserver());
	}

	protected class BooleanSetObserver implements PushedBag.Observer<RecordType, Boolean> {
		public void added(RecordType record, Boolean value) {
			if( value )
				increase(record, 1);
		}

		public void removed(RecordType record, Boolean value) {
			if( value )
				increase(record, -1);
		}
	};

	public void registerBooleanSummand(PushedBag<RecordType, Boolean> sublist) {
		sublist.registerObserver(new BooleanSetObserver());
	}

	protected class BooleanValueObserver implements PushedValue.Observer<RecordType, Boolean> {
		public void modified(RecordType record, Boolean oldValue, Boolean newValue) {
			if( (newValue != null && newValue == true) && (oldValue == null || oldValue == false) )
				increase(record, 1);

			else if( (newValue == null || newValue == false) && (oldValue != null && oldValue == true) )
				increase(record, -1);
		}
	};
	
	public void registerBooleanSummand(PushedValue<RecordType, Boolean> subvalue) {
		subvalue.registerObserver(new BooleanValueObserver());
	}
};
