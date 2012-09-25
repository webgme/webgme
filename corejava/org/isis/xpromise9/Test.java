package org.isis.xpromise9;

public class Test {
	public static class LoadDirectory implements Procedure1<String[], String> {
		public Promise<String[]> invoke(String path) {
			assert(path != null);
			
			int size = 5 - path.length();
			if( size < 0 ) {
				size = 0;
			}
			
			String[] list = new String[size];
			for(int i = 0; i < size; ++i)
				list[i] = path + "/"+ i;
			
			return new Constant<String[]>(list);
		}
	};
	
	public static final LoadDirectory loadDirectory = new LoadDirectory();
	
	public static final Procedure1<Integer, String> getDirectorySize = new Procedure1<Integer, String>() {
		public Promise<Integer> invoke(String arg) {

			return null;
		}
	};
}
