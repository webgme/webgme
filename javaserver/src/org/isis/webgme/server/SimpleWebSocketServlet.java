/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;


import javax.servlet.http.HttpServletRequest;

import org.eclipse.jetty.websocket.WebSocketServlet;


public class SimpleWebSocketServlet extends WebSocketServlet{
	static final long serialVersionUID = 0;
	protected SimpleStorage storage;
	
	public SimpleWebSocket doWebSocketConnect(HttpServletRequest request, String protocol){
    	
        return new SimpleWebSocket(storage);
    }
}
