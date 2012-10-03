package org.isis.promise4;

public abstract class Future<Type> implements Promise<Type> {
	abstract void childReady();
	abstract void setParent(Observer<Type> parent);
}
