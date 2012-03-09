/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
import java.io.UnsupportedEncodingException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Vector;

import com.alibaba.fastjson.JSON;

public class GmeStorage {
	/*static librarial functions and needed values*/
	static final byte[] HEX_CHAR_TABLE = {
	    (byte)'0', (byte)'1', (byte)'2', (byte)'3',
	    (byte)'4', (byte)'5', (byte)'6', (byte)'7',
	    (byte)'8', (byte)'9', (byte)'a', (byte)'b',
	    (byte)'c', (byte)'d', (byte)'e', (byte)'f'
	    };
	public static String getSHA1(String object)  throws NoSuchAlgorithmException, UnsupportedEncodingException {
		MessageDigest md;
	    md = MessageDigest.getInstance("SHA-1");
	    byte[] sha1hash = new byte[40];
	    md.update(object.getBytes("iso-8859-1"), 0, object.length());
	    sha1hash = md.digest();
	    int index=0;
	    byte[] hex = new byte[2*sha1hash.length];
	    for (byte b : sha1hash) {
  	      int v = b & 0xFF;
  	      hex[index++] = HEX_CHAR_TABLE[v >>> 4];
  	      hex[index++] = HEX_CHAR_TABLE[v & 0xF];
  	    }
	    return new String(hex,"ASCII");
	}
	
	private HashMap<String, GmeObject> objects;
	
	public GmeStorage(){
		objects = new HashMap<String, GmeObject>();
	}
	public static String[] objectArrayToStringArray(Object[] oarray){
		String[] sarray = new String[oarray.length];
		for(int i=0;i<oarray.length;i++)
			sarray[i]=oarray[i].toString();
		return sarray;
	}
	public String testOne(){
		GmeObject root=new GmeObject();
		Vector<String> children = new Vector<String>();
		root.set("name", "root");
		root.set("intvalue","42");
		for(int i=0;i<10;i++){
			GmeObject o= new GmeObject();
			o.set("name", "object_"+i);
			String os = JSON.toJSONString(o);
			putObject(os);
			try{
				String hash = getSHA1(os);
				children.add(hash);
			}
			catch(NoSuchAlgorithmException e){
			}
			catch(UnsupportedEncodingException ec){
			}
		}
		root.set("children", children );
		putObject(JSON.toJSONString(root));
		try{
			return getSHA1(JSON.toJSONString(root));
		}
		catch(NoSuchAlgorithmException e){
			return "";
		}
		catch(UnsupportedEncodingException ec){
			return "";
		}
		
	}

	//getter setter of the storage
	public String getObject(String hash){
		GmeObject object = objects.get(hash);
		if(object==null)
			return null;
		return JSON.toJSONString(object);
	}
	public void putObject(String object){
		String hash;
		try{
			 hash = getSHA1(object);
		}
		catch(NoSuchAlgorithmException e){
			return;
		}
		catch(UnsupportedEncodingException ec){
			return;
		}
		
		objects.put(hash, JSON.parseObject(object,GmeObject.class));
	}
	public void delObject(String hash){
		objects.remove(hash);
	}
	
	public static void main(String[] args) {
		GmeStorage mystorage = new GmeStorage();
		mystorage.testOne();
	}
}
