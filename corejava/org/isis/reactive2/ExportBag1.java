/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class ExportBag1<RecordType extends Record, ValueType, TargetType extends Record>
		extends PushedBag<RecordType, ValueType> {

	protected PulledValue<TargetType, ValueType> value;
	protected PulledValue<TargetType, RecordType> pointer;

	public ExportBag1(PulledValue<TargetType, ValueType> value,
			PulledValue<TargetType, RecordType> pointer) {
		/*
		 * We need access to the old value, so the pointer and value cannot
		 * be the same since they would change simultaneously. 
		 */  
		assert (pointer != value);
		
		this.pointer = pointer;
		this.value = value;

		pointer.registerObserver(new PointerObserver());
		value.registerObserver(new ValueObserver());
	}

	protected class PointerObserver implements
			PushedValue.Observer<TargetType, RecordType> {
		public void modified(TargetType record, RecordType oldTarget,
				RecordType newTarget) {

			ValueType a = value.get(record);

			if (oldTarget != null)
				signalRemoved(oldTarget, a);

			if (newTarget != null)
				signalAdded(newTarget, a);
		}
	};

	protected class ValueObserver implements
			PushedValue.Observer<TargetType, ValueType> {
		public void modified(TargetType record, ValueType oldValue,
				ValueType newValue) {

			RecordType target = pointer.get(record);
			if (target != null) {
				signalRemoved(target, oldValue);
				signalAdded(target, newValue);
			}
		}
	};
}
