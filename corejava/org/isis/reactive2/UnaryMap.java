/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class UnaryMap<RecordType extends Record, ValueType, ArgType> extends
		PulledValue<RecordType, ValueType> {

	protected Function<ValueType, ArgType> func;
	protected PulledValue<RecordType, ArgType> arg;

	public UnaryMap(Function<ValueType, ArgType> function,
			PulledValue<RecordType, ArgType> arg) {
		this.func = function;
		this.arg = arg;

		arg.registerObserver(new ArgObserver());
	}

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

	public static <ValueType> Function<Boolean, ValueType[]> CONTAINS(
			ValueType fixed) {
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

	protected class ArgObserver implements Observer<RecordType, ArgType> {
		public void modified(RecordType record, ArgType oldValue,
				ArgType newValue) {
			signalModified(record, func.compute(oldValue),
					func.compute(newValue));
		}
	};

	public ValueType get(RecordType record) {
		return func.compute(arg.get(record));
	}
};
