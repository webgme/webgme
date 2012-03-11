/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import java.util.Calendar;

public class Log {
	public static boolean _debug=true;
	public static boolean _timed=true;
	public static void debug(String text){
		/*TODO: make the color yellow*/
		if(_debug){
			print("[DEB] "+text);
		}
	}
	public static void error(String text){
		/*TODO: make the color green*/
		print("[ERR] "+text);
	}
	public static void info(String text){
		print("[INF] "+text);
	}
	public static String putHash(String raw){
		return "H["+raw+"]";
	}
	protected static void print(String text){
		if(_timed){
			text="["+Calendar.getInstance().getTime()+"] "+text;
		}
		System.out.println(text);
	}
	
}
