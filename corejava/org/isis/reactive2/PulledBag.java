/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive2;

import java.util.*;

public abstract class PulledBag<RecordType extends Record, ValueType> extends
		PushedBag<RecordType, ValueType> {

	public abstract Iterator<ValueType> iterator(RecordType record);
};
