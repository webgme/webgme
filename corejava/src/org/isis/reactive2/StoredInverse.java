/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.Collection;

public class StoredInverse<RecordType extends Record, ValueType extends Record>
		extends StoredBag<RecordType, ValueType> {

	public StoredInverse(Record.Getter<RecordType, Collection<ValueType>> field, 
			PushedValue<ValueType, RecordType> pointer) {
		
		super(field, new PushedInverse<RecordType, ValueType>(pointer));
	}
};
