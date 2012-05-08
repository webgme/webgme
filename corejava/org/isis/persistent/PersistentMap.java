package org.isis.persistent;

import java.util.*;

public abstract class PersistentMap<Key, Value> implements Map<Key, Value> {

	protected final int size;
	protected final int hash;

	protected PersistentMap(int size, int hash) {
		this.size = size;
		this.hash = hash;
	}

	public final int size() {
		return size;
	}

	public final boolean isEmpty() {
		return size == 0;
	}

	public final int hashCode() {
		return hash;
	}

	public abstract Value get(Object key);

	public abstract Iterator<Entry<Key, Value>> entryIterator();

	protected static final class EntrySet<Key, Value> extends PersistentSet<Entry<Key, Value>> {
		protected final PersistentMap<Key, Value> map;
		
		protected EntrySet(PersistentMap<Key, Value> map) {
			super(map.size, map.hash + 101);
			this.map = map;
		}

		public Iterator<Entry<Key, Value>> iterator() {
			return map.entryIterator();
		}
		
		@SuppressWarnings("unchecked")
		public boolean contains(Object entry) {
			if( !(entry instanceof Entry) )
				return false;
			
			Entry<Value, Key> ent = (Entry<Value, Key>)entry;

			Object key = ent.getKey();
			assert( key != null );

			Value value = map.get(ent.getKey());
			return value != null && value.equals(ent.getValue());
		}
		
		@SuppressWarnings("unchecked")
		public boolean equals(Object other) {
			if( other instanceof EntrySet ) {
				EntrySet<Key, Value> o = (EntrySet<Key,Value>)other;
				return map.equals(o.map);
			}
			
			return super.equals(other);
		}
	};
	
	public final Set<Entry<Key, Value>> entrySet() {
		return new EntrySet<Key, Value>(this);
	}

	public final boolean containsKey(Object key) {
		assert( key != null );

		Value value = get(key);
		return value != null;
	}

	protected static final class KeySet<Key, Value> extends PersistentSet<Key> {
		protected final PersistentMap<Key, Value> map;
		
		protected KeySet(PersistentMap<Key, Value> map) {
			super(map.size, map.hash + 102);
			this.map = map;
		}

		public Iterator<Key> iterator() {
			return new KeyIterator<Key, Value>(map.entryIterator());
		}

		public boolean contains(Object key) {
			return map.containsKey(key);
		}
		
		@SuppressWarnings("unchecked")
		public boolean equals(Object other) {
			if( other instanceof KeySet ) {
				KeySet<Key, Value> o = (KeySet<Key,Value>)other;
				return map.equals(o.map);
			}
			
			return super.equals(other);
		}
	};
	
	protected static final class KeyIterator<Key,Value> implements Iterator<Key> {

		protected final Iterator<Entry<Key, Value>> iter;
		
		protected KeyIterator(Iterator<Entry<Key, Value>> iter) {
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
	
	public final Set<Key> keySet() {
		return new KeySet<Key,Value>(this);
	}

	public boolean containsValue(Object value) {
		assert( value != null );
		
		Iterator<Entry<Key, Value>> iter = entryIterator();
		while( iter.hasNext() ) {
			Entry<Key, Value> entry = iter.next();
			if( value.equals(entry.getValue()) )
					return true;
		}
		
		return false;
	}

	protected static final class ValueCollection<Key, Value> extends PersistentCollection<Value> {
		protected final PersistentMap<Key, Value> map;
		
		protected ValueCollection(PersistentMap<Key, Value> map) {
			super(map.size, map.hash + 103);
			this.map = map;
		}

		public Iterator<Value> iterator() {
			return new ValueIterator<Key, Value>(map.entryIterator());
		}

		public boolean contains(Object value) {
			return map.containsValue(value);
		}
		
		@SuppressWarnings("unchecked")
		public boolean equals(Object other) {
			if( other instanceof ValueCollection ) {
				ValueCollection<Key, Value> o = (ValueCollection<Key,Value>)other;
				return map.equals(o.map);
			}
			
			return super.equals(other);
		}
	};
	
	protected static final class ValueIterator<Key,Value> implements Iterator<Value> {

		protected final Iterator<Entry<Key, Value>> iter;
		
		protected ValueIterator(Iterator<Entry<Key, Value>> iter) {
			this.iter = iter;
		}

		public boolean hasNext() {
			return iter.hasNext();
		}

		public Value next() {
			return iter.next().getValue();
		}

		public void remove() {
			throw new UnsupportedOperationException();
		}
	}
	
	public final Collection<Value> values() {
		return new ValueCollection<Key, Value>(this);
	}

	public final void clear() {
		throw new UnsupportedOperationException();
	}

	public final Value put(Key arg0, Value arg1) {
		throw new UnsupportedOperationException();
	}

	public final void putAll(Map<? extends Key, ? extends Value> arg0) {
		throw new UnsupportedOperationException();
	}

	public final Value remove(Object arg0) {
		throw new UnsupportedOperationException();
	}
}
