package org.isis.persistent;

import java.util.*;

public abstract class PersistentLinkedList<Value> extends
		PersistentList<Value> {

	protected final PersistentLinkedList<Value> rest;

	public abstract Value first();

	public final PersistentLinkedList<Value> rest() {
		return rest;
	}

	protected static final class ListIterator<Value>
			implements Iterator<Value> {

		protected PersistentLinkedList<Value> list;

		protected ListIterator(PersistentLinkedList<Value> list) {
			this.list = list;
		}

		public boolean hasNext() {
			assert (list.size > 0 || list == EMPTY);
			return list != EMPTY;
		}

		public Value next() {
			Value value = list.first();
			assert (value != null);

			list = list.rest;
			return value;
		}

		public void remove() {
			throw new UnsupportedOperationException();
		}
	};

	public final Iterator<Value> iterator() {
		return new ListIterator<Value>(this);
	}

	protected static final int HASH_BASIS = -2128831035;
	protected static final int HASH_PRIME = 16777619;

	protected PersistentLinkedList() {
		super(0, HASH_BASIS);
		this.rest = null;
	}
	
	protected static final class EmptyNode extends PersistentLinkedList<Object> {
		public Object first() {
			throw new UnsupportedOperationException();
		}
	};

	@SuppressWarnings("rawtypes")
	protected static final PersistentLinkedList EMPTY = new EmptyNode();
	
	@SuppressWarnings("unchecked")
	public static <Value> PersistentLinkedList<Value> EMPTY() {
		return EMPTY;
	}

	protected PersistentLinkedList(int first, PersistentLinkedList<Value> rest) {
		super(rest.size + 1, (rest.hash ^ ((rest.size << 16) + first)) * HASH_PRIME);
		this.rest = rest;
	}

	protected static final class ObjNode<Value> extends
			PersistentLinkedList<Value> {
		protected final Value first;

		public Value first() {
			return first;
		}

		protected ObjNode(Value first, PersistentLinkedList<Value> rest) {
			super(first == null ? 0 : first.hashCode(), rest);
			this.first = first;
		}
	};

	public static final <Value> PersistentLinkedList<Value> construct(
			Value first, PersistentLinkedList<Value> rest) {
		assert (first != null && rest != null);
		return new ObjNode<Value>(first, rest);
	}

	protected static final class IntNode extends PersistentLinkedList<Integer> {
		protected final int first;

		public Integer first() {
			return first;
		}

		protected IntNode(int first, PersistentLinkedList<Integer> rest) {
			super(first, rest);
			this.first = first;
		}
	};

	public static final PersistentLinkedList<Integer> construct(int first,
			PersistentLinkedList<Integer> rest) {
		assert (rest != null);
		return new IntNode(first, rest);
	}
}
