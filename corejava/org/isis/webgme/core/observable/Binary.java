/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.core.observable;

public class Binary extends Value {

	public static abstract class Function {
		public abstract Object compute(Object arg1, Object arg2);
	};

	protected final Function func;
	protected final Value arg1;
	protected final Value arg2;
	
	protected final Observer obs1 = new Observer() {
		public void modified(Object[] object, Object oldValue, Object newValue) {
			Object other = arg2.get(object);
			notifyObservers(object, func.compute(oldValue, other), func.compute(newValue, other));
		}
	};

	protected final Observer obs2 = new Observer() {
		public void modified(Object[] object, Object oldValue, Object newValue) {
			Object other = arg1.get(object);
			notifyObservers(object, func.compute(other, oldValue), func.compute(other, newValue));
		}
	};

	public Binary(Class klass, Function function, Value arg1, Value arg2) {
		super(klass);

		this.func = function;
		this.arg1 = arg1;
		this.arg2 = arg2;
		
		arg1.registerObserver(obs1);
		arg2.registerObserver(obs2);
	}

	public Object get(Object[] object) {
		return func.compute(arg1.get(object), arg2.get(object));
	}
};
