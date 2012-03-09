/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
public final class GmeOptions {
	enum ServerType{
		STANDALONE, /*there is no real back-end, but one encapsulated back-end*/
		DISTRIBUTED, /*there is no backend encapsulated with the server just the dispatcher which handles the connected backends*/
		STANDARD; /*it has one encapsulated back-end and a dispatcher as well*/
	}
	public static ServerType _type=ServerType.STANDALONE;
	public static int _controlPort = 888;
	
}
