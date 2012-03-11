/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import java.util.HashMap;

public class SimpleStorage {
	private HashMap<String, String> objects;
	private String root;
	public SimpleStorage(){
		objects = new HashMap<String, String>();
	}
	public void put(String key, String value){
		objects.put(key, value);
	}
	public String get(String key){
		return objects.get(key);
	}
	public String getRoot(){
		return objects.get(root);
	}
	public void putRoot(String key, String value){
		root = key;
		objects.put(key, value);
	}
}
