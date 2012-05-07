package org.isis.persistent;

public class Test {

	static PersistentLinkedList<Byte> hihi = PersistentLinkedList.EMPTY();
	static PersistentLinkedList<Integer> haha = PersistentLinkedList.EMPTY();
	static PersistentLinkedList<PersistentLinkedList<Byte>> hehe = PersistentLinkedList.EMPTY();
	static PersistentLinkedList<PersistentLinkedList<Byte>> aaaa = PersistentLinkedList.construct(hihi, hehe);

	public static void main(String[] args) {
	}
}
