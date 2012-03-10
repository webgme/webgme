/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import java.io.IOException;
import java.util.Vector;

import org.eclipse.jetty.io.ConnectedEndPoint;
import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocketServletConnectionD00;

import com.alibaba.fastjson.JSON;

public class SimpleWebSocket implements WebSocket,WebSocket.OnTextMessage {
	protected WebSocketServletConnectionD00 connection;
	protected SimpleStorage storage;
	protected String client;
	public SimpleWebSocket(SimpleStorage s){
		storage = s;
	}
	
	public void onOpen(Connection conn){
		connection = (WebSocketServletConnectionD00) conn;
		ConnectedEndPoint c = (ConnectedEndPoint) connection.getEndPoint();
		client = "C["+c.getRemoteAddr()+":"+c.getRemotePort()+"]";
		Log.info(client+"websocket connection opened");
    }
    
    public void onClose(int closeCode, String message){
    	Log.info(client+"websocket connection closed with "+closeCode+" \""+message+"\"");
    }

    public void onMessage( String data){
    	Log.info(client+" request arrives to websocket");
    	Log.debug(client+" request arrives to websocket with content: "+data);
    	Vector<Commit> transaction = (Vector<Commit>) JSON.parseArray(data,Commit.class);
    	Vector<Commit> response = new Vector<Commit>();
    	for(int i=0;i<transaction.size();i++){
    		if(transaction.get(i).object!=null){
    			//save object
    			//assertion of hash is needed
    			Log.debug(client+" saving object H["+transaction.get(i).hash+"]");
    			storage.put(transaction.get(i).hash, transaction.get(i).object);
    			//probably some response needed as well, but now we didn't need it
    		}
    		else{
    			//get object
    			Log.debug(client+" loading object H["+transaction.get(i).hash+"]");
    			Commit cresponse = new Commit();
    			cresponse.hash = transaction.get(i).hash;
    			cresponse.object = storage.get(cresponse.hash);
    			if(cresponse.object==null){
    				Log.error(client+" searched object H["+cresponse.hash+"] was not found");
    			}
    			else{
    				Log.debug(client+" object H["+cresponse.hash+"] \""+cresponse.object+"\" added to response");
    				response.add(cresponse);
    			}
    		}
    	}
    	try{
    		String rtext = JSON.toJSONString(response);
    		connection.sendMessage(rtext);
    		Log.info(client+" responding to request");
    		Log.debug(client+" responding to request with: "+rtext);
    	}
    	catch(IOException e){
    		Log.error(client+" error on sending message from websocket");
    		e.printStackTrace();
    	}
    }
}
