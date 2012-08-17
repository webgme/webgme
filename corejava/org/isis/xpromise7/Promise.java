package org.isis.xpromise7;

public abstract class Promise<Type> {
	protected Promise<?> parent;

	final void setParent(Promise<?> parent) {
		assert (parent != null && this.parent == null);
		this.parent = parent;
		prepare();
	}

	final void setValue(Type value) {
		assert(parent != null);
	}
	
	protected abstract void prepare();
}
