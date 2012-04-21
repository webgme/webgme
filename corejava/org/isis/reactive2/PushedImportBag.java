/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class PushedImportBag<RecordType extends Record, ValueType, TargetType extends Record>
		extends PushedBag<RecordType, ValueType> {

	protected PulledValue<TargetType, RecordType> pointer;
	protected PulledValue<TargetType, ValueType> value;

	public PushedImportBag(PulledValue<TargetType, RecordType> pointer,
			PulledValue<TargetType, ValueType> value) {

		assert (pointer != value);
		this.pointer = pointer;
		this.value = value;

		pointer.registerObserver(new PointerObserver());
		value.registerObserver(new ValueObserver());
	}

	public PushedImportBag(PulledValue<TargetType, RecordType> pointer) {

		assert (pointer != value);
		this.pointer = pointer;
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
