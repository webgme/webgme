/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;

public class SimpleServer {

	protected static int port=80;
	protected static String root="";
	/**
	 * @param args
	 */
	public static void main(String[] args) throws Exception{
		// TODO Auto-generated method stub
		Server server = new Server(port);
		
		ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
	    context.setContextPath("/");
	    server.setHandler(context);
	 
	    context.addServlet(new ServletHolder(new SimpleFileServlet(root)),"/*");
	    //context.addServlet(new ServletHolder(new GmeWebSocketServlet()), "/ws/*");
	    server.start();
	    server.join();
		
	}

}
