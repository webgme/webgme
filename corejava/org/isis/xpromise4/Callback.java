package org.isis.xpromise4;

public class Callback<Type> {
	
	Provider<Type> provider = null;
	
	void setProvider(Provider<Type> provider) {
		assert(provider != null && this.provider == null);
		
		this.provider = provider;
	}
	
	void done(Type value) {
	}
	
	void error(Exception exception) {
	}
	
	void cancel() {
		if(provider != null) {
			provider.cancel();
		}
	}
}
