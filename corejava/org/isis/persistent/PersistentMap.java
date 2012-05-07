package org.isis.persistent;

import java.util.*;

public abstract class PersistentMap<Key, Value> implements Map<Key, Value> {

	protected final int size;
	protected final int hash;

	protected PersistentMap(int size, int hash) {
		this.size = size;
		this.hash = hash;
	}

	public int size() {
		return size;
	}

	public boolean isEmpty() {
		return size == 0;
	}

	public int hashCode() {
		return hash;
	}

	public abstract Value get(Object key);

	public abstract Set<Map.Entry<Key, Value>> entrySet();

	public boolean containsKey(Object arg0) {
		Iterator iter = entrySet().iterator();
		while( iter.hasNext() ) {
			
		}
	}

	public boolean containsValue(Object arg0) {
		// TODO Auto-generated method stub
		return false;
	}

	protected static final class KeySet<Key> extends PersistentSet<Key> {
		protected final Set<Map.Entry<Key, ?>> entries;
		
		protected KeySet(PersistentSet<Map.Entry<Key, ?>> entries) {
			super(entries.size, entries.hash + 1973);
			this.entries = entries;
		}

		public Iterator<Key> iterator() {
			return new KeyIterator<Key>(entries.iterator());
		}
	};
	
	public static final class KeyIterator<Key> implements Iterator<Key> {

		Iterator<Map.Entry<Key, ?>> iter;
		
		protected KeyIterator(Iterator<Map.Entry<Key, ?>> iter) {
			this.iter = iter;
		}

		public boolean hasNext() {
			return iter.hasNext();
		}

		public Key next() {
			return iter.next().getKey();
		}

		public void remove() {
			throw new UnsupportedOperationException();
		}
	}
	
	public Set<Key> keySet() {
		// TODO Auto-generated method stub
		return null;
	}

	public Collection<Value> values() {
		// TODO Auto-generated method stub
		return null;
	}

	public void clear() {
		throw new UnsupportedOperationException();
	}

	public Value put(Key arg0, Value arg1) {
		throw new UnsupportedOperationException();
	}

	public void putAll(Map<? extends Key, ? extends Value> arg0) {
		throw new UnsupportedOperationException();
	}

	public Value remove(Object arg0) {
		throw new UnsupportedOperationException();
	}
}
