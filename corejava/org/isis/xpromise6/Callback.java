package org.isis.xpromise6;

public interface Callback<Type> {
	public void setValue(Type value);
	public void fail(Exception exception);
}
