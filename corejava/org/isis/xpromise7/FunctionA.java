package org.isis.xpromise7;

public abstract class FunctionA<Type, Arg> extends Promise<Type> {

	protected final void addArgument(Promise<Arg> arg) {
		arg.setParent(this);
	}
	
	protected abstract Promise<Type> calculate(Arg[] arg);
}
