/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

import java.util.*;

@SuppressWarnings("unchecked")
public class Stage<Type> extends Value<Type> {

	protected int index;
	protected Value<Type> value;
	
	protected ArrayList<Object[]> changed = new ArrayList<Object[]>();
	
	protected Stage(Class klass, Value<Type> value) {
		super(klass);

		index = klass.addDefValue(unmodified);
		this.value = value;

		value.registerObserver(observer);
	}

	protected static final Object unmodified = new Object();

	public Type get(Object[] object) {
		Object backup = object[index];
		
		if( backup == unmodified ) 
			return value.get(object);
		
		return (Type)backup;
	}

	protected final Observer<Type> observer = new Observer<Type>() {
		public final void modified(Object[] object, Type oldValue, Type newValue) {
			Object backup = object[index];
			if( backup == unmodified ) {
				changed.add(object);
				object[index] = oldValue;
			}
		}
	};

	public final boolean isDirty() {
		return ! changed.isEmpty();
	}

	public final void commit() {
		for(;;) {
			int last = changed.size() - 1;
			if( last < 0 )
				return;
			
			Object[] object = changed.remove(last);
			Type oldValue = (Type)object[index];

			assert(oldValue != unmodified);
			object[index] = unmodified;
			
			Type newValue = value.get(object);
			
			notifyObservers(object, oldValue, newValue);
		}
	}
};
