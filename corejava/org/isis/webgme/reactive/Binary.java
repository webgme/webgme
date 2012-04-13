/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.webgme.reactive;

public class Binary<Type, Arg1, Arg2> extends Value<Type> {

	public static abstract class Function<Type, Arg1, Arg2> {
		public abstract Type compute(Arg1 arg1, Arg2 arg2);
	};

	public static final Binary.Function<Boolean, Boolean, Boolean> AND = new Function<Boolean, Boolean, Boolean>() {
		public final Boolean compute(Boolean arg1, Boolean arg2) {
			if (arg1 == null || arg2 == null)
				return null;

			return arg1.booleanValue() && arg2.booleanValue();
		}
	};

	public static final Binary.Function<Boolean, Boolean, Boolean> OR = new Function<Boolean, Boolean, Boolean>() {
		public final Boolean compute(Boolean arg1, Boolean arg2) {
			if (arg1 == null || arg2 == null)
				return null;

			return arg1.booleanValue() || arg2.booleanValue();
		}
	};

	protected final Function<Type, Arg1, Arg2> func;
	protected final Value<Arg1> arg1;
	protected final Value<Arg2> arg2;

	protected final Observer<Arg1> obs1 = new Observer<Arg1>() {
		public final void modified(Object[] row, Arg1 oldValue, Arg1 newValue) {
			Arg2 other = arg2.get(row);
			notifyObservers(row, func.compute(oldValue, other),
					func.compute(newValue, other));
		}
	};

	protected final Observer<Arg2> obs2 = new Observer<Arg2>() {
		public final void modified(Object[] row, Arg2 oldValue, Arg2 newValue) {
			Arg1 other = arg1.get(row);
			notifyObservers(row, func.compute(other, oldValue),
					func.compute(other, newValue));
		}
	};

	protected Binary(Table table, Function<Type, Arg1, Arg2> function,
			Value<Arg1> arg1, Value<Arg2> arg2) {
		super(table);

		this.func = function;
		this.arg1 = arg1;
		this.arg2 = arg2;

		arg1.registerObserver(obs1);
		arg2.registerObserver(obs2);
	}

	public final Type get(Object[] row) {
		return func.compute(arg1.get(row), arg2.get(row));
	}
};
