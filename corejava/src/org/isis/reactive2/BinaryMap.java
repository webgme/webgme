/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class BinaryMap<RecordType extends Record, ValueType, Arg1Type, Arg2Type> extends PulledValue<RecordType, ValueType> {

	protected Function<ValueType, Arg1Type, Arg2Type> func;
	protected PulledValue<RecordType, Arg1Type> arg1;
	protected PulledValue<RecordType, Arg2Type> arg2;

	protected BinaryMap(Function<ValueType, Arg1Type, Arg2Type> function,
			PulledValue<RecordType, Arg1Type> arg1, PulledValue<RecordType, Arg2Type> arg2) {

		this.func = function;
		this.arg1 = arg1;
		this.arg2 = arg2;

		arg1.registerObserver(new FirstObserver());
		arg2.registerObserver(new SecondObserver());
	}

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

	protected class FirstObserver implements Observer<RecordType, Arg1Type> {
		public void modified(RecordType record, Arg1Type oldValue, Arg1Type newValue) {
			Arg2Type other = arg2.get(record);
			signalModified(record, func.compute(oldValue, other),
					func.compute(newValue, other));
		}
	};

	protected class SecondObserver implements Observer<RecordType, Arg2Type> {
		public void modified(RecordType record, Arg2Type oldValue, Arg2Type newValue) {
			Arg1Type other = arg1.get(record);
			signalModified(record, func.compute(other, oldValue),
					func.compute(other, newValue));
		}
	};

	public ValueType get(RecordType record) {
		return func.compute(arg1.get(record), arg2.get(record));
	}
};
