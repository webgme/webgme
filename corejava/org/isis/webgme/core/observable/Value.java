/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.core.observable;

public abstract class Value {

	public interface Observer {
		public void modified(Object[] object, Object oldValue, Object newValue);
	};
	
	protected final Class klass;
	protected Observer[] observers = new Observer[0];

	public Value(Class klass) {
		this.klass = klass;
	}

	public Class getDeclaringClass() {
		return klass;
	}

	public void registerObserver(Observer observer) {
		Observer[] old  = observers;
		
		observers = new Observer[old.length + 1];
		System.arraycopy(old,  0, observers, 0, old.length);
		
		observers[old.length] = observer;
	}

	public abstract Object get(Object[] object);

	protected void notifyObservers(Object[] object, Object oldValue, Object newValue) {
		for(Observer observer : observers) {
			observer.modified(object, oldValue, newValue);
		}
	}
};
