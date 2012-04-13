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

	public static final Unary.Function<Boolean, Boolean> NOT = new Function<Boolean, Boolean>() {
		public final Boolean compute(Boolean arg) {
			if (arg == null)
				return null;

			return !arg.booleanValue();
		}
	};

	public static final Unary.Function<Boolean, Integer> NONZERO = new Function<Boolean, Integer>() {
		public final Boolean compute(Integer arg) {
			if (arg == null)
				return null;

			return arg.intValue() != 0;
		}
	};

	public static <Type> Unary.Function<Boolean, Type[]> CONTAINS(Type fixed) {
		final Type fix = fixed;
		return new Function<Boolean, Type[]>() {
			public Boolean compute(Type[] arg) {
				if (arg == null)
					return false;

				for (Type value : arg) {
					if (fix.equals(value))
						return true;
				}

				return false;
			}
		};
	}

	protected final Function<Type, Arg> func;
	protected final Value<Arg> arg;

	protected final Observer<Arg> observer = new Observer<Arg>() {
		public final void modified(Object[] row, Arg oldValue, Arg newValue) {
			notifyObservers(row, func.compute(oldValue),
					func.compute(newValue));
		}
	};

	protected Unary(Table table, Function<Type, Arg> function, Value<Arg> arg) {
		super(table);

		this.func = function;
		this.arg = arg;

		arg.registerObserver(observer);
	}

	public final Type get(Object[] row) {
		return func.compute(arg.get(row));
	}
};
