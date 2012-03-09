import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletException;

import java.io.IOException;

import org.eclipse.jetty.websocket.WebSocketServlet;
import org.eclipse.jetty.websocket.WebSocket;
import org.eclipse.jetty.util.log.Log;

public class GmeWSForwarderServlet extends WebSocketServlet{
	private GmeDispatcher _dispatcher;
	
	public GmeWSForwarderServlet(GmeDispatcher d){
		_dispatcher = d;
	}
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException ,IOException {
		getServletContext().getNamedDispatcher("default").forward(request,response);
	}
	
	public GmeWSForwarder doWebSocketConnect(HttpServletRequest request, String protocol){
    	return new GmeWSForwarder(_dispatcher);
    }
}
