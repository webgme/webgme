package org.isis.persistent;

import java.util.*;

public abstract class PersistentArrayList<Value> extends PersistentList<Value> {

	protected PersistentArrayList(int size, int hash) {
		super(size, hash);
	}

	protected static final class IntArray extends PersistentArrayList<Integer> {

		protected final int[] array;
		
		protected IntArray(int[] array, int size) {
			super(size, 0);
			this.array = array;
		}

		public Integer get(int index) {
			if( index < 0 || index >= size )
				throw new IndexOutOfBoundsException();
			
			return array[index];
		}

		public IntArray prefix(int end) {
			if( end < 0 || end > size )
				throw new IndexOutOfBoundsException();

			return new IntArray(array, end);
		}
	};
	
	protected static final class ObjArray<Value> extends PersistentArrayList<Value> {

		protected final Value[] array;
		
		protected ObjArray(Value[] array, int size) {
			super(size, 0);
			this.array = array;
		}

		public Value get(int index) {
			if( index < 0 || index >= size )
				throw new IndexOutOfBoundsException();
			
			return array[index];
		}

		public ObjArray<Value> prefix(int end) {
			if( end < 0 || end > size )
				throw new IndexOutOfBoundsException();

			return new ObjArray<Value>(array, end);
		}
	};
	
	protected static final class ArrayIterator<Value> implements
			ListIterator<Value> {

		protected final PersistentArrayList<Value> array;
		protected int index;

		protected ArrayIterator(PersistentArrayList<Value> array, int index) {
			this.array = array;
			this.index = index;
		}

		public boolean hasNext() {
			return index < array.size;
		}

		public int nextIndex() {
			return index+1;
		}

		public boolean hasPrevious() {
			return index > 0;
		}

		public int previousIndex() {
			return index-1;
		}

		public Value next() {
			if( index >= array.size )
				throw new NoSuchElementException();
			
			Value value = array.get(index++);
			assert (value != null);

			return value;
		}

		public Value previous() {
			if( index <= 0 )
				throw new NoSuchElementException();

			Value value = array.get(--index);
			assert (value != null);

			return value;
		}

		public void remove() {
			throw new UnsupportedOperationException();
		}

		public void add(Value value) {
			throw new UnsupportedOperationException();
			
		}

		public void set(Value value) {
			throw new UnsupportedOperationException();
		}
	};

	public final Iterator<Value> iterator() {
		return new ArrayIterator<Value>(this, 0);
	}
	
	public final ListIterator<Value> listIterator() {
		return new ArrayIterator<Value>(this, 0);
	}

	public final ListIterator<Value> listIterator(int index) {
		assert( 0 <= index && index <= size );
		return new ArrayIterator<Value>(this, index);
	}

	public abstract PersistentList<Value> prefix(int end);
	
	public final PersistentList<Value> subList(int start, int end) {
		if( start != 0 )
			throw new UnsupportedOperationException();
		
		return prefix(end);
	}
}
