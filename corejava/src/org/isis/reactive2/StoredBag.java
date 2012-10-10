/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.*;

public class StoredBag<RecordType extends Record, ValueType> extends PulledBag<RecordType, ValueType> {

	protected Record.Getter<RecordType, Collection<ValueType>> field;

	public StoredBag(Record.Getter<RecordType, Collection<ValueType>> field) {
		this.field = field;
	}
	
	public StoredBag(Record.Getter<RecordType, Collection<ValueType>> field, 
			PushedBag<RecordType, ValueType> subbag) {
		this.field = field;
		registerPart(subbag);
	}
	
	public void add(RecordType record, ValueType value) {
		Collection<ValueType> bag = field.get(record);
		
		bag.add(value);
		signalAdded(record, value);
	}
	
	public void remove(RecordType record, ValueType value) {
		Collection<ValueType> bag = field.get(record);
		
		assert(bag.contains(value));
		bag.remove(value);
		signalRemoved(record, value);
	}
	
	public Iterator<ValueType> iterator(RecordType record) {
		Collection<ValueType> bag = field.get(record);
		return bag.iterator();
	}
	
	protected class PartObserver implements PushedBag.Observer<RecordType, ValueType> {
		public void added(RecordType record, ValueType value) {
			add(record, value);
		}

		public void removed(RecordType record, ValueType value) {
			remove(record, value);
		}
	};

	public void registerPart(PushedBag<RecordType, ValueType> part) {
		part.registerObserver(new PartObserver());
	}
};
