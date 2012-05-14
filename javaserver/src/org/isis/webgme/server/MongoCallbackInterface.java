package org.isis.webgme.server;

public interface MongoCallbackInterface {

	public void getComplete(int error, String object);
	public void setComplete(int error);
}
