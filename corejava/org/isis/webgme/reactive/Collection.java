/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

import java.util.*;

@SuppressWarnings("unchecked")
public class Collection extends Value<Integer> {

	protected int index;
	protected Table target;

	protected Collection(Table table) {
		super(table);

		index = table.addDefValue(null);
	}

	public final Integer get(Object[] row) {
		return getTargets(row).size();
	}

	protected Pointer pointer = null;

	protected void declarePointer(Pointer pointer) {
		assert (this.pointer == null);

		this.pointer = pointer;
	}

	protected void addTarget(Object[] row, Object[] target) {
		List<Object[]> list = getTargets(row);
		assert (list.indexOf(target) < 0);

		int size = list.size();
		list.add(target);

		notifyObservers(row, size, size + 1);
	}

	protected void removeTarget(Object[] row, Object[] target) {
		List<Object[]> list = getTargets(row);
		assert (list.indexOf(target) >= 0);

		int size = list.size();
		list.remove(target);
		assert (list.size() == size - 1);

		notifyObservers(row, size, size - 1);
	}

	public final List<Object[]> getTargets(Object[] row) {
		List<Object[]> list = (List<Object[]>) row[index];

		if (list == null) {
			list = new ArrayList<Object[]>();
			row[index] = list;
		}

		return list;
	}
};
