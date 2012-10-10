/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public class Record {
	public abstract static class Getter<RecordType extends Record, ValueType> {
		public abstract ValueType get(RecordType record);
	};

	public abstract static class Setter<RecordType extends Record, ValueType>
			extends Getter<RecordType, ValueType> {
		public abstract void set(RecordType record, ValueType value);
	};
}
