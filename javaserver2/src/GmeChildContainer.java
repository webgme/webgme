import java.util.Iterator;
import java.util.Vector;

class GmeChildrenContainer extends Object{
	private Vector<String> children;
	public GmeChildrenContainer(){
		children = new Vector<String>();
	}
	public GmeChildrenContainer(String childrenlist){
		children = new Vector<String>();
		String[] carray = childrenlist.split(",");
		for(int i=0;i<carray.length;i++)
			put(carray[i]);
	}
	public GmeChildrenContainer(String[] childrenlist){
		children = new Vector<String>();
		for(int i=0;i<childrenlist.length;i++)
			put(childrenlist[i]);
	}
	public Object[] toArray(){
		return  children.toArray();
	}
	public String toString(){
		String retval="[";
		boolean haselements =  false;
		Iterator<String> i=children.iterator();
		while(i.hasNext()){
			haselements=true;
			retval+="\""+i.next()+"\",";
		}
		if(haselements)
			retval = retval.substring(0, retval.lastIndexOf(','));
		retval+="]";
		return retval;
	}
	public void put(String child){
		if(child!=null && !child.equals(""))
			if(!children.contains(child))
				children.add(child);
	}
	public void remove(String child){
		if(child!=null && !child.equals(""))
			children.remove(child);
	}
	public boolean isChild(String child){
		if(child==null || child.equals(""))
			return false;
		return children.contains(child);
	}
}
