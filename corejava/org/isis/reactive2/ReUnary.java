/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class ReUnary<ObservableType extends ReObservable, ValueType, ArgType> extends ReValue<ObservableType, ValueType> {

	public static abstract class Function<ValueType, ArgType> {
		public abstract ValueType compute(ArgType arg);
	};

	public static Function<Boolean, Boolean> NOT = new Function<Boolean, Boolean>() {
		public Boolean compute(Boolean arg) {
			if (arg == null)
				return null;

			return !arg.booleanValue();
		}
	};

	public static Function<Boolean, Integer> NONZERO = new Function<Boolean, Integer>() {
		public Boolean compute(Integer arg) {
			if (arg == null)
				return null;

			return arg.intValue() != 0;
		}
	};

	public static <ValueType> Function<Boolean, ValueType[]> CONTAINS(ValueType fixed) {
		final ValueType fix = fixed;
		return new Function<Boolean, ValueType[]>() {
			public Boolean compute(ValueType[] arg) {
				if (arg == null)
					return false;

				for (ValueType value : arg) {
					if (fix.equals(value))
						return true;
				}

				return false;
			}
		};
	}

	protected Function<ValueType, ArgType> func;
	protected ReValue<ObservableType, ArgType> arg;

	protected Observer<ObservableType,ArgType> observer = new Observer<ObservableType, ArgType>() {
		public void modified(ObservableType observable, ArgType oldValue, ArgType newValue) {
			notifyObservers(observable, func.compute(oldValue),
					func.compute(newValue));
		}
	};

	public ReUnary(Function<ValueType, ArgType> function, ReValue<ObservableType, ArgType> arg) {
		this.func = function;
		this.arg = arg;

		arg.registerObserver(observer);
	}

	public ValueType get(ObservableType observable) {
		return func.compute(arg.get(observable));
	}
};
