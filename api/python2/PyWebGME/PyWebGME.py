import webgme

#w = webclient("http://localhost","078dd342-6695-af73-b4cc-90aeb4820feetoken")
w = webgme.client("http://localhost","078dd342-6695-af73-b4cc-90aeb4820feetoken")

db = w.connect()

p = db.getProject('kecso2')

r = p.getRoot('master')

nodeRoot = webgme.node(r)

children = nodeRoot.children

sm1 = None
for child in children:
    if child.attributes['name'] == 'sm1':
        sm1 = child

if sm1 != None:
    children = sm1.children
    for child in children:
        print(child.attributes["name"]+" : " + str(child.relatedConnections))
