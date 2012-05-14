package org.isis.webgme.server;

import com.alibaba.fastjson.JSON;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Date;

public class AsyncMongoTest implements MongoCallbackInterface {

	private int objectcounter;
	private String payload = "";
	private int _level;
	private int _children;
	private int _payload;
	private int _objectnumber;
	private AsyncMongoStorage _storage;
	private Object _lock = new Object();
	private long _cstart;
	private long _cend;
	private long _rstart;
	private long _rend;
	private File _file = new File("java.data.out");
	private  BufferedWriter _writer;
	public void getComplete(int error, String object) {
		synchronized(_lock){
			//System.out.println(objectcounter);
			try{
				putobject(object);
			}
			catch(Exception e){
				
			}
			if(--objectcounter == 0){
				this.getTreeComplete();
			}
		}
		MongoTestObject mobj = new MongoTestObject();
		mobj = JSON.parseObject(object, mobj.getClass());
		
		if(mobj.children.length>0){
			for(int i=0;i<mobj.children.length;i++){
				readObject(mobj.children[i]);
			}
		}
	}

	public void setComplete(int error) {
		synchronized(_lock){
			//System.out.println(this.objectcounter);
			if(--objectcounter == 0){
				this.setTreeComplete();
			}
		}
	}
	private void putobject(String object) throws IOException{
		this._writer.write(object);
		this._writer.newLine();
	}
	private long timeStamp(){
		Date now = new Date();
		return now.getTime();
	}
	private void printResult(){
		System.out.println("testing parameters: depth="+this._level+", children="+this._children+", payload="+this._payload);
		System.out.println("testing results: creation time="+(this._cend-this._cstart)+"ms, read time="+(this._rend-this._rstart)+"ms");
	}
	private void getTreeComplete(){
		this._rend = timeStamp();
		//System.out.println("getting objects done "+timeStamp());
		try{
			this._writer.close();
		}
		catch(Exception e){
			
		}
		printResult();
	}
	private void setTreeComplete(){
		this._cend = timeStamp();
		//System.out.println("setting objects done "+timeStamp());
		this._rstart = timeStamp();
		//System.out.println("getting objects start "+timeStamp());
		this.objectcounter=this._objectnumber;
		readObject("root");
	}

	private void readObject(String rootid){
		this._storage.get(rootid,this);
	}
	private void createSubTree(String rootid,int level){
		MongoTestObject root = this.createObject(rootid);
		if(level<this._level){
			root.children = new String[this._children];
			for(int i=0;i<this._children;i++){
				root.children[i] = rootid+"_"+i;
				this.createSubTree(rootid+"_"+i, level+1);
			}
		}
		else{
			root.children = new String[0];
		}
		this._storage.put(rootid, JSON.toJSONString(root), this);
	}
	private MongoTestObject createObject(String id){
		MongoTestObject o = new MongoTestObject();
		o.name = "n"+id;
		o.husi = this.payload;
		o._id = id;
		return o;
	}
	public void Test(int level,int children,int payload){
		for(int i=0;i<payload;i++)
			for(int j=0;j<1024;j++)
				this.payload+="a";
		_children = children;
		_level = level;
		_payload = payload;
		_storage = new AsyncMongoStorage();
		
		
		this._cstart = timeStamp();
		//System.out.println("setting objects start "+timeStamp());
		int previouslevel=1;
		int sum=1;
		int currentlevel=1;
		for(int i=0;i<this._level;i++){
			currentlevel=previouslevel;
			currentlevel*=this._children;
			sum+=currentlevel;
			previouslevel=currentlevel;
		}
		this.objectcounter = sum;
		this._objectnumber = sum;
		createSubTree("root",0);
	}
	
	
	public static void main(String[] args) throws Exception{
		AsyncMongoTest me = new AsyncMongoTest();
		try{
			me._writer = new BufferedWriter(new FileWriter(me._file));
			me.Test(5, 10, 2);
		}
		catch(Exception e){
		}
	}
}
