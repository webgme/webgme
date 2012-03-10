/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import java.util.HashMap;

public class SimpleStorage {
	private HashMap<String, String> objects;
	public SimpleStorage(){
		objects = new HashMap<String, String>();
	}
	public void put(String key, String value){
		objects.put(key, value);
	}
	public String get(String key){
		return objects.get(key);
	}
}
