package org.isis.xpromise7;

public abstract class Function1<Type, Arg> extends Promise<Type> {
	Promise<Arg> arg;

	protected final void setArgument(Promise<Arg> arg) {
		assert(arg != null && this.arg == null);
		this.arg = arg;
		arg.setParent(this);
	}
	
	protected abstract Promise<Type> calculate(Arg arg);
}
