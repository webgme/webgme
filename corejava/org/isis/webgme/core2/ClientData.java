package org.isis.webgme.core2;

import org.isis.reactive2.*;

public class ClientData extends ReObservable {

	protected Client __client;
	public static ReField<ClientData,Client> client = new ReField<ClientData,Client>() {
		public Client get(ClientData entry) {
			return entry.__client;
		}
		protected void rawSet(ClientData entry, Client value) {
			entry.__client = value;
		}
	};

	protected Data __data;
	public static ReField<ClientData,Data> data = new ReField<ClientData,Data>() {
		public Data get(ClientData entry) {
			return entry.__data;
		}
		protected void rawSet(ClientData entry, Data value) {
			entry.__data = value;
		}
	};

	
	
	protected String[] __patterns;
	public static ReField<ClientData,String[]> patterns = new ReField<ClientData,String[]>() {
		public String[] get(ClientData entry) {
			return entry.__patterns;
		}
		protected void rawSet(ClientData entry, String[] value) {
			entry.__patterns = value;
		}
	};
	
	public ReValue<ClientData,Boolean> selfPatterns = new ReUnary<ClientData, Boolean, String[]>(ReUnary.CONTAINS("self"), patterns); 
	public ReValue<ClientData,Boolean> childrenPatterns = new ReUnary<ClientData, Boolean, String[]>(ReUnary.CONTAINS("children"), patterns); 
	public ReValue<ClientData,Boolean> ancestorPatterns = new ReUnary<ClientData, Boolean, String[]>(ReUnary.CONTAINS("ancestor"), patterns);

}
