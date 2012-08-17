package org.isis.xpromise6;

public class AsyncValue<Type> {
	
	protected final Callback<Type> parent;
	
	protected AsyncValue(Callback<Type> parent) {
		assert(parent != null);
		this.parent = parent;
	}
	
	protected final void resolve(Type value) {
		parent.setValue(value);
	}
	
	protected final void raise(Exception exception) {
		assert(exception != null);
		
		parent.fail(exception);
	}
}
