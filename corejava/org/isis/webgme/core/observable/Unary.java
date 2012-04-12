/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.core.observable;

public class Unary extends Value {

	public static abstract class Function {
		public abstract Object compute(Object arg);
	};

	protected final Function func;
	protected final Value arg;

	protected final Observer observer = new Observer() {
		public void modified(Object[] object, Object oldValue, Object newValue) {
			notifyObservers(object, func.compute(oldValue), func.compute(newValue));
		}
	};
	
	public Unary(Class klass, Function function, Value arg) {
		super(klass);

		this.func = function;
		this.arg = arg;
		
		arg.registerObserver(observer);
	}

	public Object get(Object[] object) {
		return func.compute(arg.get(object));
	}
};
