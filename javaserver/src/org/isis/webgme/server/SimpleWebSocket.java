/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
package org.isis.webgme.server;

import java.io.IOException;
import java.util.List;
import java.util.Vector;

import org.eclipse.jetty.websocket.WebSocket;

import com.alibaba.fastjson.JSON;

public class SimpleWebSocket implements WebSocket,WebSocket.OnTextMessage {
	protected Connection connection;
	protected SimpleStorage storage;
	protected String client;
	public SimpleWebSocket(SimpleStorage s){
		storage = s;
	}
	
	public void onOpen(Connection conn){
		connection = conn;
		connection.setMaxTextMessageSize(1073741824);
		connection.setMaxIdleTime(600000);
		/*TODO: getting the information of the client*/
		client = "C[TODO]";
		Log.info(client+"websocket connection opened");
    }
    
    public void onClose(int closeCode, String message){
    	Log.info(client+"websocket connection closed with "+closeCode+" \""+message+"\"");
    }

    public void onMessage( String data){
    	Log.info(client+" request arrives to websocket");
    	Log.debug(client+" request arrives to websocket with content: "+data);
    	Vector<Commit> response = new Vector<Commit>();
    	try{
    		List<Commit> transaction = JSON.parseArray(data,Commit.class);
	    	for(int i=0;i<transaction.size();i++){
	    		if(transaction.get(i).object!=null){
	    			/*save object*/
	    			/*TODO: hash assertion*/
	    			String checkhash = Hash.SHA1(transaction.get(i).object);
	    			if(!checkhash.equals(transaction.get(i).hash)){
	    				Log.error(client+" hash mismatch received "+Log.putHash(transaction.get(i).hash)+" calculated "+Log.putHash(checkhash));
	    			}
	    			Log.debug(client+" saving object "+Log.putHash(transaction.get(i).hash));
	    			storage.put(transaction.get(i).hash, transaction.get(i).object);
	    			/*TODO: sending some state response*/
	    		}
	    		else{
	    			/*get object*/
	    			Log.debug(client+" loading object "+Log.putHash(transaction.get(i).hash));
	    			Commit cresponse = new Commit();
	    			cresponse.hash = transaction.get(i).hash;
	    			cresponse.object = storage.get(cresponse.hash);
	    			if(cresponse.object==null){
	    				Log.error(client+" searched object "+Log.putHash(cresponse.hash)+" was not found");
	    			}
	    			else{
	    				Log.debug(client+" object "+Log.putHash(cresponse.hash)+" \""+cresponse.object+"\" added to response");
	    				response.add(cresponse);
	    			}
	    		}
	    	}
    	}
    	catch(Exception e){
    		Log.error(client+" wrong incoming message");
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
