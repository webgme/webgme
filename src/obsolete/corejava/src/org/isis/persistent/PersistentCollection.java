package org.isis.persistent;

import java.util.*;

public abstract class PersistentCollection<Value> implements Collection<Value> {

	protected final int size;
	protected final int hash;

	protected PersistentCollection(int size, int hash) {
		this.size = size;
		this.hash = hash;
	}

	public final int size() {
		return size;
	}

	public final boolean isEmpty() {
		return size == 0;
	}

	public abstract Iterator<Value> iterator();

	public final int hashCode() {
		return hash;
	}

	private static final int HASH_BASIS = -2128831035;
	private static final int HASH_PRIME = 16777619;

	protected static final int firstHash(int id) {
		return HASH_BASIS + id;
	}
	
	protected static final int calcHash(int hash, int value) {
		hash ^= value;
		hash *= HASH_PRIME;
		return hash;
	}
	
	@SuppressWarnings("unchecked")
	public boolean equals(Object o) {
		assert (o != null && o instanceof PersistentCollection);

		PersistentCollection<Value> other = (PersistentCollection<Value>) o;

		if (hash != other.hash || size != other.size)
			return false;

		if (this == other)
			return true;

		Iterator<Value> iter1 = iterator();
		Iterator<Value> iter2 = other.iterator();
		while (iter1.hasNext()) {
			assert (iter2.hasNext());

			Value a = iter1.next();
			Value b = iter2.next();
			assert (a != null && b != null);

			if (!a.equals(b))
				return false;
		}
		assert (!iter2.hasNext());

		return true;
	}

	public boolean contains(Object value) {
		assert (value != null);

		Iterator<Value> iter = iterator();
		while (iter.hasNext()) {
			if (value.equals(iter.next()))
				return true;
		}

		return false;
	}

	public boolean containsAll(Collection<?> coll) {
		assert (coll != null);

		Iterator<?> iter = coll.iterator();
		while (iter.hasNext()) {
			if (!contains(iter.next()))
				return false;
		}

		return true;
	}

	public final Object[] toArray() {
		return toArray(new Object[size]);
	}

	@SuppressWarnings("unchecked")
	public <Type> Type[] toArray(Type[] array) {
		assert (array.length >= size);

		int pos = 0;
		Iterator<Value> iter = iterator();

		while (pos < size)
			array[pos++] = (Type) iter.next();

		assert (!iter.hasNext());
		return array;
	}

	public static void toArray(Collection<Integer> coll, int[] array) {
		int size = coll.size();
		assert (array.length >= size);

		int pos = 0;
		Iterator<Integer> iter = coll.iterator();

		while (pos < size)
			array[pos++] = iter.next();

		assert (!iter.hasNext());
	}

	public final boolean add(Value value) {
		throw new UnsupportedOperationException();
	}

	public final boolean addAll(Collection<? extends Value> collection) {
		throw new UnsupportedOperationException();
	}

	public final void clear() {
		throw new UnsupportedOperationException();
	}

	public final boolean remove(Object o) {
		throw new UnsupportedOperationException();
	}

	public final boolean removeAll(Collection<?> c) {
		throw new UnsupportedOperationException();
	}

	public final boolean retainAll(Collection<?> c) {
		throw new UnsupportedOperationException();
	}
}
