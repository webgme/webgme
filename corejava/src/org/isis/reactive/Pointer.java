/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive;

import java.util.*;

public class Pointer extends Value<Object[]> {

	protected int index;
	protected Table target;
	protected Collection collection;

	protected Pointer(Table table, Collection collection) {
		super(table);

		index = table.addDefValue(null);
		this.collection = collection;
		
		collection.declarePointer(this);
	}

	protected Collection getCollection() {
		return collection;
	}
	
	public final Object[] get(Object[] row) {
		return (Object[]) (row[index]);
	}

	public final void set(Object[] row, Object[] value) {
		Object[] oldValue = (Object[]) row[index];
		row[index] = value;

		notifyObservers(row, oldValue, value);
	}

	public class Import<Type> extends Value<Type> {

		Value<Type> value;

		public final Observer<Type> observer = new Observer<Type>() {
			public void modified(Object[] row, Type oldValue, Type newValue) {
				List<Object[]> targets = collection.getTargets(row);

				for(Object[] target : targets) {
					notifyObservers(target, oldValue, newValue);
				}
			}
		};
		
		public Import(Value<Type> value) {
			super(value.table);

			this.value = value;
			value.registerObserver(observer);
		}
		
		public final Type get(Object[] row) {
			Object[] target = Pointer.this.get(row);
			return target != null ? value.get(target) : null;
		}
	};
	
	public <Type> Value<Type> declareImport(Value<Type> value) {
		assert(value != null && value.getDeclaringTable() == collection.getDeclaringTable());
		
		return new Import<Type>(value);
	}
};
