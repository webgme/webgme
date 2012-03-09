/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;

import java.io.File;
import java.io.IOException;
import java.io.BufferedReader;
import java.io.FileReader;

public class GmeFileServlet extends HttpServlet{
	protected String rootpath = "D:\\_WORK_\\_GIT_\\gmeserver\\javaserver\\pages"; //for windows we use this now
	static final long serialVersionUID = 1;
	protected String convertToPath(String uri){
		return uri.replace('/', File.separatorChar);
	}
	private String mimeType(String path){
		String extension = "";
		int from = path.lastIndexOf('.');
		if( from>0 )
			extension = path.substring(from);
		
		if(extension.equals(".js"))
			return "application/x-javascript";
		if(extension.equals(".ico"))
			return "image/x-icon";
		return "text/html";
	}
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
	{
		//get the requested path and
		//modify to index.html if it is not existing
		
		String path = request.getPathInfo();
		if(path.equals("/"))
			path="/index.html";
		path=rootpath+convertToPath(path);
		
		GmeLogger.log("file - "+path+" - was requested");
		//check if requested file exists
		File file=new File(path);
		if(file.exists()){
			//send back the file - currently we send all file as text/html
			response.setContentType(mimeType(path));
			response.setStatus(HttpServletResponse.SC_OK);
		}
		else{
			//generate 404 response
			response.setContentType("text/html");
			response.setStatus(HttpServletResponse.SC_NOT_FOUND);
			path = rootpath+File.separator+"notfound.html";
		}
		GmeLogger.log("sending - "+path+" - as a response");
		BufferedReader br = new BufferedReader(new FileReader(path));
		String line;
		while((line = br.readLine()) != null) response.getWriter().println(line);
		br.close();
	}
}
