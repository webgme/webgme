import java.util.Enumeration;
import java.util.HashMap;
import java.util.Vector;

public class GmeProject {
	private String name;
	private gmemodel root;
	private HashMap objects;
	static public int counter=0;
	
	public GmeProject(String name){
		this.name=name;
		objects = new HashMap();
		root = new gmemodel(this.objects, "root");
		gmemodel tmodel = new gmemodel(this.objects, "m1");
		root.addChild(tmodel);
		for(int i=0;i<9;i++)
			root.addChild(new gmemodel(this.objects,"m"+(i+2)));
		for(int i=0;i<5;i++)
			tmodel.addChild(new gmemodel(this.objects,"mm"+(i+1)));
	}
	
	public String getName(){
		return name;
	}
	
	public String getRoot(){
		return root.json();
	}
	public String printObject(String id){
		gmemodel m = (gmemodel) objects.get(id);
		if(m!=null)
			return m.json();
		return "{}";
	}

	public class gmemodel {
		private HashMap attributes;
		public gmemodel(HashMap container){
			attributes = new HashMap();
			attributes.clear();
			attributes.put("name", "");
			attributes.put("id",Integer.toString(GmeProject.counter));
			container.put(Integer.toString(GmeProject.counter), this);
			counter++;
			attributes.put("children", new Vector());
		}
		public gmemodel(HashMap container, String name){
			attributes = new HashMap();
			attributes.clear();
			attributes.put("name", name);
			attributes.put("id",Integer.toString(GmeProject.counter));
			container.put(Integer.toString(GmeProject.counter), this);
			counter++;
			attributes.put("children", new Vector());		
		}
		public void addChild(gmemodel child){
			Vector children = (Vector) attributes.get("children");
			children.add(child);
		}
		public String json(){
			String retval="{";
			retval+="name : \""+attributes.get("name")+"\"";
			retval+=",";
			retval+="id : \""+attributes.get("id")+"\"";
			retval+=",";
			Vector children = (Vector) attributes.get("children");
			Enumeration en = children.elements();
			retval+="children : [";
			boolean haschildren=false;
			while(en.hasMoreElements()){
				haschildren=true;
				gmemodel m = (gmemodel) en.nextElement();
				retval+="\""+m.getAttribute("id")+"\",";
			}
			if(haschildren)
				retval=retval.substring(0, retval.lastIndexOf(','));
			retval+="]";
			retval+="}";
			return retval;
		}
		public Object getAttribute(String aname){
			return attributes.get(aname);
		}
	}
	
}
