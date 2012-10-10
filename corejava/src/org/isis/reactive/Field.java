/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive;

@SuppressWarnings("unchecked")
public class Field<Type> extends Value<Type> {

	protected int index;

	protected Field(Table table, Type defValue) {
		super(table);

		index = table.addDefValue(defValue);
	}

	public final Type get(Object[] row) {
		return (Type) (row[index]);
	}

	public final void set(Object[] row, Type value) {
		Type oldValue = (Type) row[index];
		row[index] = value;

		notifyObservers(row, oldValue, value);
	}
};
