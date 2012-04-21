/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.*;

public class PushedImportValue<RecordType extends Record, ValueType, TargetType extends Record>
		extends PushedValue<RecordType, ValueType> {

	protected PulledBag<TargetType, RecordType> inverse;
	protected PulledValue<TargetType, ValueType> field;

	public PushedImportValue(PulledBag<TargetType, RecordType> inverse,
			PulledValue<TargetType, ValueType> field) {

		this.field = field;
		this.inverse = inverse;

		field.registerObserver(new ValueObserver());
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

	protected class InverseObserver implements
			PushedBag.Observer<RecordType, TargetType> {
		public void added(RecordType record, TargetType target) {
			if( target != null ) {
				ValueType value = field.get(target); 
				signalModified(record, null, value);
			}
		}

		public void removed(RecordType record, TargetType target) {
			if( target != null ) {
				ValueType value = field.get(target); 
				signalModified(record, value, null);
			}
		}
	};
}
