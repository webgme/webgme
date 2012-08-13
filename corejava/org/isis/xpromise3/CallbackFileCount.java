/**
 * Copyright (C) Miklos Maroti, 2012
 *
 * This program is free software; you can redistribute it and/or modify it 
 * under the terms of the GNU General Public License as published by the 
 * Free Software Foundation; either version 2 of the License, or (at your 
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General 
 * Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along 
 * with this program; if not, write to the Free Software Foundation, Inc., 
 * 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 */

package org.isis.xpromise3;

public class CallbackFileCount {

	static final void loadDirectory(String dir, Callback<String[]> subdirs) {
		assert (dir != null);

		int size = 5 - dir.length();
		if (size < 0) {
			size = 0;
		}

		String[] list = new String[size];
		for (int i = 0; i < size; ++i)
			list[i] = dir + "/" + i;

		subdirs.done(list);
	}

	static final void getDirectorySize(String dir, final Callback<Integer> size) {
		assert(dir != null && size != null);
		
		loadDirectory(dir, new Callback<String[]>(size) {
			public void done(String[] subdirs) {
				assert(subdirs != null);
				
				AsyncArray<Integer> array = new AsyncArray<Integer>(this);
				for(int i = 0; i < subdirs.length; ++i) 
					getDirectorySize(subdirs[i], array.add());

				array.finalize(new Callback<Integer[]>(this) {
					public void done(Integer[] sizes) {
						assert(sizes != null);
						
						int s = 1;
						for(int i = 0; i < sizes.length; ++i) 
							s += sizes[i];
						
						size.done(s);
					}
				});
			}
		});
	}
}
