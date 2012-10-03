package org.isis.promise4;

public final class Constant<Type> implements Promise<Type> {
	private Type value;

	Constant(Type value) {
		this.value = value;
	}

	public Type getValue() {
		return value;
	}

	@Override
	public void cancel(Exception reason) {
	}

	@Override
	public void setParent(Future<?> parent) {
		// to force the use of the more efficient getValue
		assert (false);
	}
}
