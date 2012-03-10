package org.isis.webgme.server;

import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.websocket.WebSocket.Connection;

public class SimpleWebSocket implements WebSocket,WebSocket.OnTextMessage {
	
	public SimpleWebSocket(SimpleStorage s){
		
	}
	
	public void onOpen(Connection connection){
    }
    
    public void onClose(int closeCode, String message){
    }

    public void onMessage( String data){
    	
    }
}
