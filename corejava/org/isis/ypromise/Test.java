package org.isis.ypromise;

public class Test {
	public static Promise<String[]> loadDirectory(String path) {
		assert(path != null);
		
		int size = 5 - path.length();
		if( size < 0 ) {
			size = 0;
		}
		
		String[] list = new String[size];
		for(int i = 0; i < size; ++i)
			list[i] = path + "/"+ i;
		
		return new Promise<String[]>(list);
	}

	public static Promise<Integer> getDirectorySize(String path) {
		Promise<String[]> directory = loadDirectory(path);
		return new FutureCall1<Integer, String[]>(directory) {
			public Integer execute(String[] directory) {
				return null;
			}
		};
	}
	
	public static void main(String[] args) {
	}
}
