package org.isis.xpromise4;

abstract class AsyncProc<Type, Arg> extends Provider<Type> {

	AsyncProc(Callback<Type> callback) {
		super(callback);
	}

	Callback<Arg> arg = new Callback<Arg>() {
		
	};
	
	abstract void calc(Arg arg, Callback<Type> callback);
	
	void cancel() {
		
	}
};
