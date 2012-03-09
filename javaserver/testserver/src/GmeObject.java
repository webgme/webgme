import java.util.Vector;

class GmeObject{
		public String name;
		public Vector<String> children;
		public GmeObject(){
			name="";
			children = new Vector<String>();
		}
		//getter setter functions
		public Object get(String aname){
			if(aname.equals("name"))
				return name;
			if(aname.equals("children"))
				return (Object) children;
			return null;
		}
		public void set(String key, Object value){
			if(key.equals("name"))
				name = (String) value;
			if(key.equals("children")){
				try{
					children = (Vector<String>) value;
				}
				catch(Exception e){
					
				}
			}
			
		}
	}
