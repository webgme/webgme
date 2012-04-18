/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive3;

import java.util.ArrayList;
import java.util.List;

public class Table<RecordType extends Table.Record> {

	protected static class Record {
	};

	public static abstract class Collator<ValueType> {
		public abstract class Observer {
			public abstract void added(ValueType oldValue);
			public abstract void removed(ValueType oldValue);
		};
	}

	public abstract class Value<ValueType> {
		public abstract ValueType get(RecordType record);

		public abstract class Observer {
			public abstract void modified(RecordType record, ValueType oldValue, ValueType newValue);
		};
		
		protected List<Observer> observers = new ArrayList<Observer>();
		
		public void registerObserver(Observer observer) {
			assert(!observers.contains(observer));
			observers.add(observer);
		}
		
		public void unregisterObserver(Observer observer) {
			assert(observers.contains(observer));
			observers.remove(observer);
		}
		
		protected boolean hasChanged(ValueType oldValue, ValueType newValue) {
			return oldValue != newValue
					&& (oldValue == null || !oldValue.equals(newValue));
		};
	
		protected void notifyObservers(RecordType record, ValueType oldValue, ValueType newValue) {
			assert (newValue == get(record));

			if (hasChanged(oldValue, newValue)) {
				for (Observer observer : observers) {
					observer.modified(record, oldValue, newValue);
				}
			}
		}
	};
	
	public abstract class Field<ValueType> extends Value<ValueType> {
		protected abstract void rawSet(RecordType record, ValueType value);

		public void set(RecordType record, ValueType newValue) {
			ValueType oldValue = get(record);
			rawSet(record, newValue);
			notifyObservers(record, oldValue, newValue);
		}
	}

	// TODO: add notification from target table
	public class Import<TargetType extends Record, ValueType> extends Value<ValueType> {

		protected Value<TargetType> pointer;
		protected Table<TargetType>.Value<ValueType> value;

		public Import(Value<TargetType> pointer, Table<TargetType>.Value<ValueType> value) {
			this.pointer = pointer;
			this.value = value;
			
			pointer.registerObserver(pointer.new Observer() {
				public void modified(RecordType record, TargetType oldTarget,
						TargetType newTarget) {
					
					ValueType oldValue = Import.this.value.get(oldTarget);
					ValueType newValue = Import.this.value.get(newTarget);

					Import.this.notifyObservers(record, oldValue, newValue);
				}
			});
		}
		
		public ValueType get(RecordType record) {
			TargetType target = pointer.get(record);

			if(target == null)
				return null;
			
			return value.get(target);
		}
	}
	
};
