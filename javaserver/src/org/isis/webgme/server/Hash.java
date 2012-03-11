package org.isis.webgme.server;

import java.security.MessageDigest;

public class Hash {
	static final byte[] HEX_CHAR_TABLE = {
	    (byte)'0', (byte)'1', (byte)'2', (byte)'3',
	    (byte)'4', (byte)'5', (byte)'6', (byte)'7',
	    (byte)'8', (byte)'9', (byte)'a', (byte)'b',
	    (byte)'c', (byte)'d', (byte)'e', (byte)'f'
	    };
	public static String SHA1(String object){
		MessageDigest md;
		try{
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
		    return new String(hex);
		}
		catch(Exception e){
			return null;
		}
	}

}
