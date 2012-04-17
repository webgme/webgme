package org.isis.webgme.core2;

import org.isis.reactive2.*;
import java.util.*;

public class Data extends ReObservable {

	protected Data __parent;
	public static ReField<Data,Data> parent = new ReField<Data,Data>() {
		public Data get(Data entry) {
			return entry.__parent;
		}
		protected void rawSet(Data entry, Data value) {
			entry.__parent = value;
		}
	};

	protected List<Data> __children;
	public static ReCollection<Data,Data> children = new ReCollection<Data,Data>(parent) {
		protected Collection<Data> rawGet(Data observable) {
			return observable.__children;
		}
	};
	
	protected List<ClientData> __clientData;
	public static ReCollection<Data,ClientData> clientData = new ReCollection<Data,ClientData>(ClientData.data) {
		protected Collection<ClientData> rawGet(Data observable) {
			return observable.__clientData;
		}
	};
}
