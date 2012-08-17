package org.isis.xpromise6;

public abstract class AsyncFunc1<Type, Arg> extends AsyncValue<Type> implements Callback<Arg> {
	
	protected AsyncFunc1(Callback<Type> parent) {
		super(parent);
	}

	protected abstract void calc(Arg value, Callback<Type> parent); 
	
	@Override
	public final void setValue(Arg value) {
		calc(value, parent);
	}

	@Override
	public final void fail(Exception exception) {
		raise(exception);
	}
}
