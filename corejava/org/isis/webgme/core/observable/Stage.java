/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.core.observable;

public class Stage extends Value {

	protected Value value;
	protected int index;
	
	public Stage(Class klass, Value value, int index) {
		super(klass);

		this.value = value;
		this.index = index;
		
		value.registerObserver(observer);
	}

	protected final Observer observer = new Observer() {
		public void modified(Object[] object, Object oldValue, Object newValue) {
			Object backup = object[index];
			if( backup == null )
				object[index] = oldValue;
		}
	};
	
	public Object get(Object[] object) {
		Object backup = object[index];
		return backup != null ? backup : value.get(object);
	}
	
	public void commit() {
	}
};
