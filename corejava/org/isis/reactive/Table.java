/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

package org.isis.reactive;

public class Table {

	protected Object[] defValues = new Object[0];

	protected int addDefValue(Object defValue) {
		assert (!isSealed());

		Object[] old = defValues;
		defValues = new Object[old.length + 1];
		System.arraycopy(old, 0, defValues, 0, old.length);
		defValues[old.length] = defValue;

		return old.length;
	}

	public <Type> Field<Type> declareField(Type defValue) {
		assert (!isSealed());

		return new Field<Type>(this, defValue);
	};

	public <Type, Arg> Value<Type> declareMethod(
			Unary.Function<Type, Arg> function, Value<Arg> arg) {
		assert (!isSealed());
		assert (arg.getDeclaringTable() == this);

		return new Unary<Type, Arg>(this, function, arg);
	}

	public <Type, Arg1, Arg2> Value<Type> declareMethod(
			Binary.Function<Type, Arg1, Arg2> function, Value<Arg1> arg1,
			Value<Arg2> arg2) {
		assert (!isSealed());
		assert (arg1.getDeclaringTable() == this);
		assert (arg2.getDeclaringTable() == this);

		return new Binary<Type, Arg1, Arg2>(this, function, arg1, arg2);
	}

	public <Type> Stage<Type> declateStage(Value<Type> value) {
		assert (!isSealed());
		assert (value.getDeclaringTable() == this);

		return new Stage<Type>(this, value);
	}

	public RefCount declareRefCount() {
		assert (!isSealed());

		return new RefCount(this);
	}

	protected Collection declareCollection() {
		assert(!isSealed());
		
		return new Collection(this);
	}
	
	public Pointer declarePointer(Table target) {
		assert(!isSealed());
		assert(target != null);
		
		Collection collection = target.declareCollection();
		return new Pointer(this, collection);
	}
	
	protected boolean sealed = false;

	public boolean isSealed() {
		return sealed;
	}

	public void seal() {
		sealed = true;
	}

	public final Object[] newInstance() {
		assert (isSealed());

		return defValues.clone();
	}
};
