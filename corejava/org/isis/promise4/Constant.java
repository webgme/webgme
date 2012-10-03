package org.isis.promise4;

public final class Constant<Type> implements Promise<Type> {
	private Type value;

	Constant(Type value) {
		this.value = value;
	}

	@Override
	public boolean isFulfilled() {
		return true;
	}

	@Override
	public Type getValue() {
		return value;
	}
}
