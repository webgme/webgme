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

	protected static int port=8081;
	protected static String root="";
	/**
	 * @param args
	 */
	public static void main(String[] args) throws Exception{
		// TODO Auto-generated method stub
		Server server = new Server(port);
		Log.info("server will listen on port: "+port);
		
		ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
	    context.setContextPath("/");
	    server.setHandler(context);
	 
	    context.addServlet(new ServletHolder(new SimpleFileServlet(root)),"/*");
	    Log.info("the path \"/*\" will be handled by: "+SimpleFileServlet.class.toString());
	    //context.addServlet(new ServletHolder(new GmeWebSocketServlet()), "/ws/*");
	    //Log.info("the path \"/*\" will be handled by: "+SimpleFileServlet.class.toString());
	    server.start();
	    Log.info("server started");
	    
	    server.join();
	    Log.info("server stopped");
	}

}
