/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.*;

public class ExportValue<RecordType extends Record, ValueType, TargetType extends Record>
		extends PushedValue<RecordType, ValueType> {

	protected PulledValue<TargetType, ValueType> field;
	protected PulledBag<TargetType, RecordType> inverse;

	public ExportValue(PulledValue<TargetType, ValueType> field,
			PulledBag<TargetType, RecordType> inverse) {

		this.field = field;
		this.inverse = inverse;

		field.registerObserver(new ValueObserver());
		inverse.registerObserver(new InverseObserver());
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
			PushedBag.Observer<TargetType, RecordType> {
		public void added(TargetType target, RecordType record) {
			if( record != null ) {
				ValueType value = field.get(target); 
				signalModified(record, null, value);
			}
		}

		public void removed(TargetType target, RecordType record) {
			if( record != null ) {
				ValueType value = field.get(target); 
				signalModified(record, value, null);
			}
		}
	};
}
