import java.util.Calendar;

public class GmeLogger {
	private static boolean _debug=false;
	private static boolean _timed=true;
	public static void log(String line){
		if(_debug){
			if(_timed)
				System.out.println("["+Calendar.getInstance().getTime()+"] "+line);
			else
				System.out.println(line);
		}
	}
	public static void setDebug(boolean debug){
		_debug = debug;
	}
}
