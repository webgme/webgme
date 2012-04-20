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

	public abstract class Value<ValueType> {
		public abstract ValueType get(RecordType record);

		public abstract class Observer {
			public abstract void modified(RecordType record,
					ValueType oldValue, ValueType newValue);
		};

		protected List<Observer> observers = new ArrayList<Observer>();

		public void registerObserver(Observer observer) {
			assert (!observers.contains(observer));
			observers.add(observer);
		}

		public void unregisterObserver(Observer observer) {
			assert (observers.contains(observer));
			observers.remove(observer);
		}

		protected boolean hasChanged(ValueType oldValue, ValueType newValue) {
			return oldValue != newValue
					&& (oldValue == null || !oldValue.equals(newValue));
		};

		protected void notifyObservers(RecordType record, ValueType oldValue,
				ValueType newValue) {
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

	public abstract class Collection<TargetType extends Table.Record> {
		protected abstract List<TargetType> getList(RecordType record);

		protected Table<TargetType>.Value<RecordType> pointer;

		public void registerPointer(Table<TargetType>.Value<RecordType> pointer) {
			assert (this.pointer == null && pointer != null);
			this.pointer = pointer;

			pointer.registerObserver(pointer.new Observer() {
				public void modified(TargetType record, RecordType oldValue,
						RecordType newValue) {
					
					List<TargetType> list;
					
					if( oldValue != null ) {
						list = getList(oldValue);
						assert(list.contains(record));
						list.remove(record);
					}

					if( newValue != null ) {
						list = getList(newValue);
						assert(! list.contains(record));
						list.add(record);
					}
				}
			});
		}

		public Collection() {
		}

		public Collection(Table<TargetType>.Value<RecordType> pointer) {
			this.pointer = pointer;
		}

		protected class ExportValue<ValueType> extends
				Table<TargetType>.Value<ValueType> {

			protected Value<ValueType> value;

			public ExportValue(Value<ValueType> value) {
				this.value = value;

				pointer.registerObserver(pointer.new Observer() {
					public void modified(TargetType record,
							RecordType oldTarget, RecordType newTarget) {

						ValueType oldValue = ExportValue.this.value
								.get(oldTarget);
						ValueType newValue = ExportValue.this.value
								.get(newTarget);

						notifyObservers(record, oldValue, newValue);
					}
				});

				value.registerObserver(value.new Observer() {
					public void modified(RecordType record, ValueType oldValue,
							ValueType newValue) {

						List<TargetType> list = getList(record);

						for (TargetType target : list)
							notifyObservers(target, oldValue, newValue);
					}
				});
			}

			public ValueType get(TargetType target) {
				RecordType record = pointer.get(target);

				if (record == null)
					return null;

				return value.get(record);
			}
		}

		public <ValueType> Table<TargetType>.Value<ValueType> export(
				Value<ValueType> value) {
			return new ExportValue<ValueType>(value);
		}
	};
};
