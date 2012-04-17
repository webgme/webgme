/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class ReBinary<ObservableType extends ReObservable, ValueType, Arg1Type, Arg2Type> extends ReValue<ObservableType, ValueType> {

	public static abstract class Function<ValueType, Arg1Type, Arg2Type> {
		public abstract ValueType compute(Arg1Type arg1, Arg2Type arg2);
	};

	public static Function<Boolean, Boolean, Boolean> AND = new Function<Boolean, Boolean, Boolean>() {
		public Boolean compute(Boolean arg1, Boolean arg2) {
			if (arg1 == null || arg2 == null)
				return null;

			return arg1.booleanValue() && arg2.booleanValue();
		}
	};

	public static Function<Boolean, Boolean, Boolean> OR = new Function<Boolean, Boolean, Boolean>() {
		public Boolean compute(Boolean arg1, Boolean arg2) {
			if (arg1 == null || arg2 == null)
				return null;

			return arg1.booleanValue() || arg2.booleanValue();
		}
	};

	public static <Type> Function<Type, Boolean, Type> IF() {
		return new Function<Type, Boolean, Type>() {
			public Type compute(Boolean cond, Type arg) {
				if (cond == null || cond == false)
					return null;

				return arg;
			}
		};
	}

	protected Function<ValueType, Arg1Type, Arg2Type> func;
	protected ReValue<ObservableType, Arg1Type> arg1;
	protected ReValue<ObservableType, Arg2Type> arg2;

	protected Observer<ObservableType, Arg1Type> obs1 = new Observer<ObservableType, Arg1Type>() {
		public void modified(ObservableType observable, Arg1Type oldValue, Arg1Type newValue) {
			Arg2Type other = arg2.get(observable);
			notifyObservers(observable, func.compute(oldValue, other),
					func.compute(newValue, other));
		}
	};

	protected Observer<ObservableType, Arg2Type> obs2 = new Observer<ObservableType, Arg2Type>() {
		public void modified(ObservableType observable, Arg2Type oldValue, Arg2Type newValue) {
			Arg1Type other = arg1.get(observable);
			notifyObservers(observable, func.compute(other, oldValue),
					func.compute(other, newValue));
		}
	};

	protected ReBinary(Function<ValueType, Arg1Type, Arg2Type> function,
			ReValue<ObservableType, Arg1Type> arg1, ReValue<ObservableType, Arg2Type> arg2) {

		this.func = function;
		this.arg1 = arg1;
		this.arg2 = arg2;

		arg1.registerObserver(obs1);
		arg2.registerObserver(obs2);
	}

	public ValueType get(ObservableType observable) {
		return func.compute(arg1.get(observable), arg2.get(observable));
	}
};
