/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.Iterator;

public class ExportBag2<RecordType extends Record, ValueType, TargetType extends Record>
		extends PushedBag<RecordType, ValueType> {

	protected PulledBag<TargetType, ValueType> values;
	protected PulledBag<TargetType, RecordType> inverse;

	public ExportBag2(PulledBag<TargetType, ValueType> values,
			PulledBag<TargetType, RecordType> inverse) {
		
		this.values = values;
		this.inverse = inverse;
		
		values.registerObserver(new ValuesObserver());
	}

	protected class ValuesObserver implements PulledBag.Observer<TargetType, ValueType> {
		public void added(TargetType record, ValueType value) {
			Iterator<RecordType> iter = inverse.iterator(record);
			while (iter.hasNext()) {
				RecordType target = iter.next();
				signalAdded(target, value);
			}
		}

		public void removed(TargetType record, ValueType value) {
			Iterator<RecordType> iter = inverse.iterator(record);
			while (iter.hasNext()) {
				RecordType target = iter.next();
				signalRemoved(target, value);
			}
		}
	};

	protected class InverseObserver implements PushedBag.Observer<TargetType, RecordType> {
		public void added(TargetType target, RecordType record) {
			Iterator<ValueType> iter = values.iterator(target);
			while (iter.hasNext()) {
				ValueType value = iter.next(); 
				signalAdded(record, value);
			}
		}

		public void removed(TargetType target, RecordType record) {
			Iterator<ValueType> iter = values.iterator(target);
			while (iter.hasNext()) {
				ValueType value = iter.next(); 
				signalRemoved(record, value);
			}
		}
	};
}
