package org.isis.persistent;

import java.util.*;

public final class PersistentIntList extends AbstractCollection<Integer> implements Comparable<PersistentIntList> {

	private final int first;
	private final PersistentIntList rest;
	private final int size;
	private final int hash;

	private PersistentIntList(int first, PersistentIntList rest, int size, int hash) {
		assert (size >= 0);

		this.first = first;
		this.rest = rest;
		this.size = size;
		this.hash = hash;
	}

	public int first() {
		return first;
	}

	public PersistentIntList rest() {
		return rest;
	}

	public int size() {
		return size;
	}

	public int hashCode() {
		return hash;
	}

	private static final int HASH_BASIS = -2128831035;
	private static final int HASH_PRIME = 16777619;

	public static final PersistentIntList EMPTY = new PersistentIntList(0, null, 0,
			HASH_BASIS);

	public static PersistentIntList create(int first, PersistentIntList rest) {
		int hash = rest.hash ^ ((rest.size << 16) + first);
		hash *= HASH_PRIME;
		return new PersistentIntList(first, rest, rest.size + 1, hash);
	}

	public int compareTo(PersistentIntList other) {
		if (hash != other.hash)
			return hash - other.hash;

		if (this == other)
			return 0;

		if (size != other.size)
			return size - other.size;

		PersistentIntList list = this;
		while (list != other) {
			if (list.first != other.first)
				return list.first - other.first;

			other = other.rest;
			list = list.rest;
		}

		return 0;
	}

	public boolean equals(Object other) {
		if (other instanceof PersistentIntList)
			return compareTo((PersistentIntList) other) == 0;

		return false;
	}

	private static final class ListIterator implements Iterator<Integer> {

		private PersistentIntList list;

		private ListIterator(PersistentIntList list) {
			this.list = list;
		}

		public boolean hasNext() {
			return list.size != 0;
		}

		public Integer next() {
			int value = list.first;
			list = list.rest;
			return value;
		}

		public void remove() {
			throw new UnsupportedOperationException();
		}
	};

	public Iterator<Integer> iterator() {
		return new ListIterator(this);
	}
}
