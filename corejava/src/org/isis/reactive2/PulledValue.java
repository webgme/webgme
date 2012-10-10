/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

public abstract class PulledValue<RecordType extends Record, ValueType> extends
		PushedValue<RecordType, ValueType> {

	public abstract ValueType get(RecordType record);
};
