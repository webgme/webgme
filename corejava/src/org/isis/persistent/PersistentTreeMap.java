package org.isis.persistent;

import java.util.*;

public class PersistentTreeMap<Key, Value> 
	extends PersistentMap<PersistentList<Key>, Value>  {

	protected PersistentTreeMap(int size, int hash) {
		super(size, hash);
	}

	public Value get(Object key) {
		return null;
	}

	public Iterator<Entry<PersistentList<Key>, Value>> entryIterator() {
		return null;
	}
}
