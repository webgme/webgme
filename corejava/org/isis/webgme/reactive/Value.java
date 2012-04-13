/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

@SuppressWarnings("rawtypes")
public abstract class Value<Type> {

	public interface Observer<Type> {
		public void modified(Object[] object, Type oldValue, Type newValue);
	};
	
	protected final Class klass;

	protected Observer[] observers = new Observer[0];

	protected Value(Class klass) {
		this.klass = klass;
	}

	public Class getDeclaringClass() {
		return klass;
	}

	public void registerObserver(Observer<Type> observer) {
		Observer[] old  = observers;
		
		observers = new Observer[old.length + 1];
		System.arraycopy(old,  0, observers, 0, old.length);

		observers[old.length] = observer;
	}

	public abstract Type get(Object[] object);

	public final boolean hasChanged(Type oldValue, Type newValue) {
		return oldValue != newValue && (oldValue == null || !oldValue.equals(newValue)); 
	};
	
	protected final void notifyObservers(Object[] object, Type oldValue, Type newValue) {
		assert(newValue == get(object));
		
		if( hasChanged(oldValue, newValue) ) {
			for(Observer<Type> observer : observers) {
				observer.modified(object, oldValue, newValue);
			}
		}
	}
};
