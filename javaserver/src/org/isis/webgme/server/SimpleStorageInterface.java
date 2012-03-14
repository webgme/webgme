package org.isis.webgme.server;

public interface SimpleStorageInterface {
	public void put(String key, String value);
	
	public String get(String key);
	
	public String getRoot();
	
	public void putRoot(String key, String value);
}
