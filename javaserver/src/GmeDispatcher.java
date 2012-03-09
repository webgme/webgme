import java.net.*;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.util.*;
import java.io.IOException;

public class GmeDispatcher implements Runnable {
	private static Hashtable _backends;
	private static Hashtable _controlsockets;
	private static Selector _selector;
	private static ServerSocketChannel _schannel;
	private static ServerSocket _ss;
	private static SocketChannel _channel;
	private static SelectionKey _skey;
	
	public GmeDispatcher() throws IOException{
		_backends = new Hashtable();
		_controlsockets = new Hashtable();
		_schannel = ServerSocketChannel.open();
		_ss = _schannel.socket();
		_ss.bind(new InetSocketAddress(1042));
		_schannel.configureBlocking(false);
		_channel = _schannel.accept();
		
		_selector = Selector.open();
		_schannel.register(_selector, SelectionKey.OP_ACCEPT);
		_skey = _channel.register(_selector, SelectionKey.OP_READ);
		
	}
	
	public void run(){
		while(true){
			try{
				_selector.select();
			}
			catch(IOException e){
				e.printStackTrace();
				break;
			}
			
			Set rkeys = _selector.selectedKeys();
			Iterator it = rkeys.iterator();
			while(it.hasNext()){
				SelectionKey skey = (SelectionKey) it.next();
				it.remove();
				try{
					if(skey.isAcceptable()){
						//accepts new connections from backends
						
					}
					else if(skey.isReadable()){
						//read the data from the control connection and respond to it
					}
					
				}
				catch(Exception e){
					skey.cancel();
					try{
						skey.channel().close();
					}
					catch(IOException ex){
						ex.printStackTrace();
					}
				}
				
			}
		}
	}
	
}
