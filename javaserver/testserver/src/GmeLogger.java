
public class GmeLogger {
	private static boolean _debug=false;
	public static void log(String line){
		if(_debug) System.out.println(line);
	}
	public static void setDebug(boolean debug){
		_debug = debug;
	}
}
