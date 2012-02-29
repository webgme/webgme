import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;

public class GmeServer {
    public static void main(String[] args) throws Exception
    {
    	GmeLogger.setDebug(true);
    	Server server = new Server(80);
	 
	    ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
	    context.setContextPath("/");
	    server.setHandler(context);
	 
	    context.addServlet(new ServletHolder(new GmeFileServlet()),"/*");
	    GmeLogger.log("file responder is listening at \"/*\" address");
	    context.addServlet(new ServletHolder(new GmeWebSocketServlet()), "/ws/*");
	    GmeLogger.log("websocket responder is listening at \"/ws/*\" address");
	    server.start();
	    GmeLogger.log("server started");
	    server.join();
	    GmeLogger.log("server stopped");
	}

}
