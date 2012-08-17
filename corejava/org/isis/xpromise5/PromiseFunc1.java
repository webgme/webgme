package org.isis.xpromise5;

public abstract class PromiseFunc1<Type, Arg> extends Promise<Type> {
	protected PromiseFunc1(Promise<Arg> arg) {
	}
	
	protected abstract Type calc(Arg arg);
}
