/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

public class Pointer extends Value<Object[]> {

	protected int index;
	protected Table target;

	protected Pointer(Table table, Table target) {
		super(table);

		index = table.addDefValue(null);
	}

	public final Object[] get(Object[] row) {
		return (Object[]) (row[index]);
	}

	public final void set(Object[] row, Object[] value) {
		Object[] oldValue = (Object[]) row[index];
		row[index] = value;

		notifyObservers(row, oldValue, value);
	}
};
