/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.*;

public class PulledImportValue<RecordType extends Record, ValueType, TargetType extends Record>
		extends PulledValue<RecordType, ValueType> {

	protected PulledValue<RecordType, TargetType> pointer;
	protected PulledBag<TargetType, RecordType> inverse;
	protected PulledValue<TargetType, ValueType> field;

	public PulledImportValue(PulledValue<RecordType, TargetType> pointer,
			PulledBag<TargetType, RecordType> inverse,
			PulledValue<TargetType, ValueType> field) {

		this.pointer = pointer;
		this.field = field;
		this.inverse = inverse;

		field.registerObserver(new ValueObserver());
		pointer.registerObserver(new PointerObserver());
	}

	protected class ValueObserver implements
			PulledValue.Observer<TargetType, ValueType> {
		public void modified(TargetType record, ValueType oldValue,
				ValueType newValue) {

			Iterator<RecordType> iter = inverse.iterator(record);
			while (iter.hasNext()) {
				RecordType target = iter.next();
				signalModified(target, oldValue, newValue);
			}
		}
	};

	protected class PointerObserver implements
			PulledValue.Observer<RecordType, TargetType> {
		public void modified(RecordType record, TargetType oldTarget,
				TargetType newTarget) {

			ValueType oldValue = oldTarget != null ? field.get(oldTarget)
					: null;
			ValueType newValue = newTarget != null ? field.get(newTarget)
					: null;

			signalModified(record, oldValue, newValue);
		}
	};

	public ValueType get(RecordType target) {
		TargetType record = pointer.get(target);

		if (record == null)
			return null;

		return field.get(record);
	}
}
