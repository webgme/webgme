import webgme

#w = webclient("http://localhost","078dd342-6695-af73-b4cc-90aeb4820feetoken")
w = webgme.client("http://localhost","078dd342-6695-af73-b4cc-90aeb4820feetoken")

db = w.connect()

p = db.getProject('kecso')

if p != None:
    print ("yuheee")

print(p.getBranches())

r = p.getRoot('master')

if r != None:
    print("yuheeee")

gmer = webgme.node(r)
print(gmer.attributes)
print(r.attributes)

children = r.children
for child in children:
    print(child.guid + " : " + str(child))
    print(child.attributes)
    pointers = child.outPointers
    if pointers != None:
        for pointer in pointers:
            print(pointer + " : " +str(pointers[pointer]))

    pointers = child.inPointers
    if pointers != None:
        for pointer in pointers:
            print(pointer + " : " +str(pointers[pointer]))

children = gmer.children
print(children)