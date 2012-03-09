import java.io.UnsupportedEncodingException;
import java.security.NoSuchAlgorithmException;


import com.alibaba.fastjson.JSON;

public class GmeProject {
	private GmeStorage storage;
	private String root; //we store only the hash of the root here
	static public int counter=0;
	
	public GmeProject(String name){
		storage = new GmeStorage();
		root = storage.testOne();
	}
	
	public GmeResponse handleQuery(GmeQuery query){
		GmeResponse response = new GmeResponse();
		response.sequence = query.sequence;
		switch(query.type){
		case GETROOT:
				try{
					String object = getObjectByHash(root);
					if(object==null || object.equals(""))
						throw new NullPointerException();
					String hash = GmeStorage.getSHA1(object);
					response.objects.put(hash, object);
				}
				catch(NoSuchAlgorithmException e){
					response.success=false;
				}
				catch(UnsupportedEncodingException ex){
					response.success=false;
				}
				catch(NullPointerException ec){
					response.success=false;
				}
			break;
		case GETOBJECTS:
			for(int i=0;i<query.hashes.length;i++){
				try{
					String object = getObjectByHash(query.hashes[i]);
					if(object==null || object.equals(""))
						throw new NullPointerException();
					String hash = GmeStorage.getSHA1(object);
					response.objects.put(hash, object);
				}
				catch(NoSuchAlgorithmException e){
					response.success=false;
				}
				catch(UnsupportedEncodingException ex){
					response.success=false;
				}
				catch(NullPointerException ec){
					response.success=false;
				}
			}
			break;/*
		case SAVEOBJECTS:
			for(int i=0;i<query.changed.length;i++){
				try{
					String object = getObjectByHash(query.changed[i].oldHash);
					if(object==null || object.equals(""))
						throw new NullPointerException();
					//check if this is the root
					boolean isroot = query.changed[i].oldHash.equals(GmeStorage.getSHA1(object));
					//store the new object
					storage.putObject(JSON.toJSONString((GmeObject)query.changed[i]));
					//remove the old one
					storage.delObject(query.changed[i].oldHash);
					//if it was root then set to it
					if(isroot)
						root = GmeStorage.getSHA1(JSON.toJSONString((GmeObject)query.changed[i]));
				}
				catch(NoSuchAlgorithmException e){
					response.success=false;
				}
				catch(UnsupportedEncodingException ex){
					response.success=false;
				}
				catch(NullPointerException ec){
					response.success=false;
				}
				
			}
			if(response.success)
				counter++;*/
		default:
			response.success = false;
			break;
		}
		return response;
	}
	private String getObjectByHash(String hash){
		if(hash==null || hash.equals(""))
			return null;
		return storage.getObject(hash);
	}
}
