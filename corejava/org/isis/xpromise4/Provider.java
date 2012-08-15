package org.isis.xpromise4;

abstract class Provider<Type> {
	
	Provider(Callback<Type> callback) {
		assert(callback != null);
		
		callback.setProvider(this);
	}
	
	abstract void cancel();
}
