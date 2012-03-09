import java.util.HashMap;


public class GmeResponse {
	public HashMap<String,String> objects;
	public boolean success;
	public String sequence;
	
	public GmeResponse(){
		objects = new HashMap<String,String>();
		success = true;
	}
}
