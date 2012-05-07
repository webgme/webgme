package org.isis.persistent;

import java.util.*;

public abstract class PersistentSet<Value>
		extends PersistentCollection<Value> implements Set<Value> {

	protected PersistentSet(int size, int hash) {
		super(size, hash);
	}
}
