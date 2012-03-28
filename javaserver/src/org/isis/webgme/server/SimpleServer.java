/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import java.io.File;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;

public class SimpleServer {

	protected static int port=8082;
	protected static String root=System.getProperty("user.dir")+File.separator+"test";
	/**
	 * @param args
	 */
	public static void main(String[] args) throws Exception{
		Log._debug = false;
		Server server = new Server(port);
		Log.info("server will listen on port: "+port);
		
		ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
	    context.setContextPath("/");
	    server.setHandler(context);
	 
	    context.addServlet(new ServletHolder(new SimpleFileServlet(root)),"/*");
	    Log.info("the path \"/*\" will be handled by: "+SimpleFileServlet.class.toString());
	    
	    SimpleWebSocketServlet wss = new SimpleWebSocketServlet();
	    context.addServlet(new ServletHolder(wss), "/ws/*");
	    Log.info("the path \"/*\" will be handled by: "+SimpleWebSocketServlet.class.toString());
	    
	    //wss.setStorage(new SimpleStorage());
	    wss.setStorage(new MongoStorage());
	    
	    
	    server.start();
	    Log.info("server started");
	    
	    server.join();
	    Log.info("server stopped");
	}

}
