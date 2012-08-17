package org.isis.xpromise5;

public abstract class PromiseProc1<Type, Arg> extends Promise<Type> {
	protected PromiseProc1(Promise<Arg> arg) {
	}
	
	protected abstract Promise<Type> calc(Arg arg);
}
