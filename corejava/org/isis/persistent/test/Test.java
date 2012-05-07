package org.isis.persistent.test;

import org.isis.persistent.PersistentLinkedList;

public class Test {

	static PersistentLinkedList<Byte> hihi = PersistentLinkedList.empty();
	static PersistentLinkedList<Integer> haha = PersistentLinkedList.empty();
	static PersistentLinkedList<PersistentLinkedList<Byte>> hehe = PersistentLinkedList.empty();
	static PersistentLinkedList<PersistentLinkedList<Byte>> aaaa = PersistentLinkedList.prepend(hihi, hehe);

	public static void main(String[] args) {
	}
}
