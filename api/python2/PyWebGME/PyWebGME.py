import webgme
from graphml import graphml
import sf2graph

try:
    #w = webgme.client("http://localhost","078dd342-6695-af73-b4cc-90aeb4820feetoken")
    #w = webgme.client("http://localhost","1504070a-d60c-9eaa-a6e0-9c0ddbb5e444token")
    w = webgme.client("http://kecskes.isis.vanderbilt.edu","078dd342-6695-af73-b4cc-90aeb4820feetoken")
    db = w.connect()

    plist = db.getProjectList()
    graph = graphml()

#    def toGraph(item):
#        if isinstance(item,webgme.connection):
#            graph.addEdge(item.source.GUID,item.destination.GUID)
#        graph.addNode(item.GUID,item.attributes['name'])
#        children = item.children
#        for child in children:
#            toGraph(child)
#
#    def recPrint(item, indent):
#        print (indent+item.attributes["name"]+"  "+str(type(item))+"  "+item.GUID)
#        children = item.children
#        for child in children:
#            recPrint(child,indent+"  ")
#
#    if len(plist) > 0:
#        print("available projects:")
#        for i,j in enumerate(plist):
#            print(str(i)+". "+j)
#        index = input("please enter the number which project you want to open (to exit input an invalid value):")
#        index = int(index)
#        if index >=0 and index < len(plist):
#            project = db.getProject(plist[index])
#            root = project.getRoot("master")
#            rootNode = webgme.node(root)
#            #recPrint(rootNode,"");
#            toGraph(rootNode)
#            graph.display()
#            graph.writeOut("proba.graphml")
#        else:
#            exit()
#    else:
#        print("there is no available project, program stops")
#        exit()
    project = db.getProject("kecso_sf")
    root = project.getRoot("master")
    rootNode = webgme.node(root)
    mychild = None
    for child in rootNode.children:
        if child.attributes['name'] == "kecso2":
            mychild = child
    if mychild != None:
        g = sf2graph.SignalFlowToGraphML(mychild)
        g.test()
        g.writeOut()
except SystemExit as e:
    if not e.code == None:
         print(e);

