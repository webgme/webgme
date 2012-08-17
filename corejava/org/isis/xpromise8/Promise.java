package org.isis.xpromise8;

public class Promise<Type> {
	
	public static <Type> Promise<Type> constant(Type value) {
		return null;
	}

	public static <Type, Arg> Promise<Type> call(Function1<Promise<Type>, Arg> function, Arg arg) {
		return null;
	}
	
	public static <Type, Arg> Promise<Type> call(Function1<Promise<Type>, Arg> function, Promise<Arg> arg) {
		return null;
	}
}
