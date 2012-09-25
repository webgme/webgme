package org.isis.xpromise9;

public interface Procedure1<Type, Arg> {
	public Promise<Type> invoke(Arg arg);
}
