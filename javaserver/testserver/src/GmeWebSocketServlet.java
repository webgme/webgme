/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletException;

import java.io.IOException;

import org.eclipse.jetty.websocket.WebSocketServlet;
import org.eclipse.jetty.websocket.WebSocket;

import com.alibaba.fastjson.JSON;

public class GmeWebSocketServlet extends WebSocketServlet{
	static final long serialVersionUID = 1;
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException ,IOException {
		getServletContext().getNamedDispatcher("default").forward(request,response);
	}
	public GmeWebSocket doWebSocketConnect(HttpServletRequest request, String protocol){
    	
        return new GmeWebSocket();
    }
	class GmeWebSocket implements WebSocket,WebSocket.OnTextMessage
    {
        Connection _connection;
        GmeProject _project;
        

        public GmeWebSocket(){
        	GmeLogger.log("ws created");
        }
        
        public void onOpen(Connection connection){
        	_connection=connection;
        	GmeLogger.log("ws connection opened");
        }
        
        public void onClose(int closeCode, String message){
        	GmeLogger.log("ws closed because: "+closeCode+" _cc_ , and with message: "+message);
        }

        public void onMessage( String data)
        {
        	GmeLogger.log("ws got message: "+data);
        	GmeQuery query = JSON.parseObject(data, GmeQuery.class);
        	try{
        		GmeResponse response = new GmeResponse();
        		response.sequence = query.sequence;
            	if(query.type==GmeQuery.QueryType.OPENPROJECT){
            		_project = new GmeProject(query.projectname);
            	}
            	else{
        		response = _project.handleQuery(query);
            	}
            	GmeLogger.log("sending \" "+JSON.toJSONString(response)+" \" as a response");
        		_connection.sendMessage(JSON.toJSONString(response));
        	}
        	catch(Exception e){
        		GmeResponse badresp = new GmeResponse();
        		badresp.success=false;
        		try{
        			GmeLogger.log("sending \" "+JSON.toJSONString(badresp)+" \" as a BADresponse");
        			_connection.sendMessage(JSON.toJSONString(badresp));
        		}
        		catch(IOException ie){
        		}
        	}
        }        
    }	
}
