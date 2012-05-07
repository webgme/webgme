package org.isis.persistent;

import java.util.*;

public abstract class PersistentTreeMap<Key extends Comparable<Key>, Value extends Comparable<Value>> 
	extends PersistentMap<PersistentLinkedList<Key>, Value>{

	protected PersistentTreeMap(int size) {
		super(size);
	}
}
