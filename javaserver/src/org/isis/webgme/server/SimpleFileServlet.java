/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

public class SimpleFileServlet extends HttpServlet {
	static final long serialVersionUID=0;
	
	private String rootPath;
	
	
	public SimpleFileServlet(String root){
		rootPath = root;
		Log.debug(SimpleFileServlet.class.toString()+" have been created with root path: "+rootPath);
	}
	protected String convertToPath(String uri){
		Log.debug(SimpleFileServlet.class.toString()+".convertToPath input: "+uri);
		String retval=uri.replace('/', File.separatorChar);
		Log.debug(SimpleFileServlet.class.toString()+".convertToPath output: "+retval);
		return retval;
	}
	protected String mimeType(String path){
		Log.debug(SimpleFileServlet.class.toString()+".mimeType input: "+path);
		String extension = "";
		String retval="text/html";
		int from = path.lastIndexOf('.');
		if( from>0 )
			extension = path.substring(from);
		
		if(extension.equals(".js"))
			retval = "application/x-javascript";
		if(extension.equals(".ico"))
			retval = "image/x-icon";
		Log.debug(SimpleFileServlet.class.toString()+".mimeType output: "+retval);
		return retval;
	}
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
	{
		String path = request.getPathInfo();
		if(path.equals("/"))
			path="/index.html";
		path=rootPath+convertToPath(path);
		Log.info("simple file responder got a request for \""+path+"\"");
		
		/*check the existence of the file*/
		File file=new File(path);
		if(file.exists()){
			/*sending back the file*/
			response.setContentType(mimeType(path));
			response.setStatus(HttpServletResponse.SC_OK);
			Log.info("simple file responder sending back the file \""+path+"\"");
		}
		else{
			Log.error("simple file responder couldn't find \""+path+"\"");
			/*sending back the default 404 error page*/
			response.setContentType("text/html");
			response.setStatus(HttpServletResponse.SC_NOT_FOUND);
			path = rootPath+File.separator+"notfound.html";			
		}
		BufferedReader br = new BufferedReader(new FileReader(path));
		String line;
		while((line = br.readLine()) != null) response.getWriter().println(line);
		br.close();
		Log.info("simple file responder finished sending \""+path+"\"");
	}
}
