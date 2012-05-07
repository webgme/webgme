package org.isis.persistent;

import java.util.*;

public abstract class PersistentList<Value> extends PersistentCollection<Value>
		implements List<Value> {

	protected PersistentList(int size, int hash) {
		super(size, hash);
	}

	public Value get(int index) {
		if (index < 0 || index >= size)
			throw new IndexOutOfBoundsException();

		Iterator<Value> iter = iterator();
		while (--index >= 0) {
			assert (iter.hasNext());
			iter.next();
		}

		assert (iter.hasNext());
		return iter.next();
	}

	public int indexOf(Object value) {
		assert( value != null );

		int index = 0;
		
		Iterator<Value> iter = iterator();
		while (iter.hasNext()) {
			Value a = iter.next();
			assert( a != null );
			
			if( value.equals(a) )
				return index;
			
			++index;
		}

		return -1;
	}

	public int lastIndexOf(Object value) {
		assert( value != null );

		int index = 0;
		int found = -1;
		
		Iterator<Value> iter = iterator();
		while (iter.hasNext()) {
			Value a = iter.next();
			assert( a != null );
			
			if( value.equals(a) )
				found = index;
			
			++index;
		}

		return found;
	}

	public ListIterator<Value> listIterator() {
		throw new UnsupportedOperationException();
	}

	public ListIterator<Value> listIterator(int arg0) {
		throw new UnsupportedOperationException();
	}

	public final List<Value> subList(int arg0, int arg1) {
		throw new UnsupportedOperationException();
	}

	public final void add(int arg0, Value arg1) {
		throw new UnsupportedOperationException();
	}

	public final boolean addAll(int arg0, Collection<? extends Value> arg1) {
		throw new UnsupportedOperationException();
	}

	public final Value remove(int arg0) {
		throw new UnsupportedOperationException();
	}

	public final Value set(int arg0, Value arg1) {
		throw new UnsupportedOperationException();
	}
}
