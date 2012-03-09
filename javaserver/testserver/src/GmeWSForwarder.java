import org.eclipse.jetty.websocket.WebSocket;
import java.net.*;
import java.nio.channels.Selector;
import java.io.IOException;

public class GmeWSForwarder implements WebSocket,WebSocket.OnTextMessage{
	private GmeDispatcher _dispatcher;
	private Socket _backend;
	private Connection _connection;
	public GmeWSForwarder(GmeDispatcher d){
		_dispatcher = d;
		_backend = null;
	}
	public void onMessage(String message){ 
		
	}
	public void onOpen(Connection c){
		/*we should send back the available projects and sessions*/
		_connection = c;
		try{
			_connection.sendMessage("hello");
		}
		catch(IOException e){
			
		}
	}
	public void onClose(int errorcode, String errortext){
		
	}
	
	/*here comes the real message handling*/
	private void onSessionOpen(String name){
		
	}
}
