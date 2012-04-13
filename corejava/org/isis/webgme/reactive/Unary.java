/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

public class Unary<Type, Arg> extends Value<Type> {

	public static abstract class Function<Type, Arg> {
		public abstract Type compute(Arg arg);
	};

	public static final Unary.Function<Boolean, Boolean> NOT = new Unary.Function<Boolean, Boolean>() {
		public final Boolean compute(Boolean arg)
		{
			if( arg == null )
				return null;
			
			return ! arg.booleanValue();
		}
	};
	
	public static final Unary.Function<Boolean, Integer> NONZERO = new Unary.Function<Boolean, Integer>() {
		public final Boolean compute(Integer arg)
		{
			if( arg == null )
				return null;
			
			return arg.intValue() != 0;
		}
	};

	protected final Function<Type, Arg> func;
	protected final Value<Arg> arg;

	protected final Observer<Arg> observer = new Observer<Arg>() {
		public final void modified(Object[] object, Arg oldValue, Arg newValue) {
			notifyObservers(object, func.compute(oldValue), func.compute(newValue));
		}
	};
	
	protected Unary(Class klass, Function<Type, Arg> function, Value<Arg> arg) {
		super(klass);

		this.func = function;
		this.arg = arg;
		
		arg.registerObserver(observer);
	}

	public final Type get(Object[] object) {
		return func.compute(arg.get(object));
	}
};
