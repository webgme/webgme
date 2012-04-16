/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

public class Collection extends Value<Object[][]> {

	protected int index;
	protected Table target;

	protected Collection(Table table) {
		super(table);

		index = table.addDefValue(new Object[0][]);
	}

	public final Object[][] get(Object[] row) {
		return (Object[][]) (row[index]);
	}
	
	protected void addTarget(Object[] row, Object[] target) {
		Object[][] oldList = (Object[][]) row[index];
		assert(oldList != null);
		
		Object[][] newList = new Object[oldList.length + 1][];
		newList[oldList.length] = target;
		
		row[index] = newList;
		notifyObservers(row, oldList, newList);
	}
	
	protected void removeTarget(Object[] row, Object[] target) {
	}
};
