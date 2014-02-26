import webgme
from graphml import graphml

class SignalFlowToGraphML:
    def __init__(self,rootNode):
        self.__root = rootNode
        self.__gmeNodes = {}
        self.__gmeConnections = []
        self.__signalAssociations = {}
        self.__outnodes = []
        self.__intermediatenodes = []
        self.__outedges = []
        self.__parent = {}
        self.__parent[self.__root.GUID] = None
        self.__loadGMENodes(self.__root)
        self.__getOutNodes()
        self.__getIntermediateNodes()
        self.__getGMEConnections()
        self.__createBasicEdges()
        for guid in self.__intermediatenodes:
            self.__outedges = self.__removeIntermediateNode(guid)


    def __loadGMENodes(self,node):
        if not node.GUID in self.__gmeNodes.keys():
            self.__gmeNodes[node.GUID] = node
        for child in node.children:
            self.__parent[child.GUID] = node.GUID
            self.__loadGMENodes(child)

    def __getBaseNameList(self,node):
        baseNameList = []
        base = node.base
        while base != None:
            baseNameList.append(base.attributes['name'])
            base = base.base
        return baseNameList
    
    def __isPrimitive(self,node):
        if 'Primitive' in self.__getBaseNameList(node): #maybe at some point it would be wise to replace this kind of check
            return True
        return False
    def __isCompound(self,node):
        if 'Compound' in self.__getBaseNameList(node):
            return True
        return False
    def __isInputSignal(self,node):
        if 'InputSignal' in self.__getBaseNameList(node):
            return True
        return False
    def __isOutputSignal(self,node):
        if 'OutputSignal' in self.__getBaseNameList(node):
            return True
        return False
    def __isDataFlowConn(self,node):
        if 'DataFlowConn' in self.__getBaseNameList(node):
            return True
        return False

    def __getOutNodes(self):
        for guid in self.__gmeNodes:
            if self.__isPrimitive(self.__gmeNodes[guid]):
                self.__outnodes.append(guid)

    def __getIntermediateNodes(self):
        for guid in self.__gmeNodes:
            parent = self.__parent[guid]
            if parent != None and self.__isCompound(self.__gmeNodes[parent]) and ( self.__isInputSignal(self.__gmeNodes[guid]) or self.__isOutputSignal(self.__gmeNodes[guid]) ):
                self.__intermediatenodes.append(guid)

    def __removeIntermediateNode(self,guid):
        finaledges = []
        inpoints = []
        outpoints = []
        for edge in self.__outedges:
            if edge['source'] == guid:
                outpoints.append(edge['target'])
            elif edge['target'] == guid:
                inpoints.append(edge['source'])
            else:
                finaledges.append(edge)
        for source in inpoints:
            for target in outpoints:
                finaledges.append({'source':source,'target':target})
        return finaledges

    def __getGMEConnections(self):
        for guid in self.__gmeNodes:
            if isinstance(self.__gmeNodes[guid],webgme.connection):
                self.__gmeConnections.append(guid);

    def __createBasicEdges(self):
        for guid in self.__gmeConnections:
            conn = self.__gmeNodes[guid]
            if conn.source.GUID in self.__intermediatenodes:
                parent = self.__parent[conn.destination.GUID]
                if conn.destination.GUID in self.__intermediatenodes:
                    self.__outedges.append({'source':conn.source.GUID,'target':conn.destination.GUID})
                elif parent in self.__outnodes or parent in self.__intermediatenodes:
                    self.__outedges.append({'source':conn.source.GUID,'target':parent})
                else:
                    print('DEBUG:how this can happened -1- ???')
            elif conn.destination.GUID in self.__intermediatenodes:
                parent = self.__parent[conn.source.GUID]
                if parent in self.__outnodes or parent in self.__intermediatenodes:
                    self.__outedges.append({'source':parent,'target':conn.destination.GUID})
                else:
                    print('DEBUG:how this can happened -2- ???')
            else: #both end of the connection belongs to a primitive
                sparent = self.__parent[conn.source.GUID]
                tparent = self.__parent[conn.destination.GUID]
                if sparent in self.__outnodes and tparent in self.__outnodes:
                    self.__outedges.append({'source':sparent,'target':tparent})
                else:
                    print('DEBUG:how this can happened -3- ???') 

    def __isConnected(self,oneSignal, otherSignal):
        node = self.__gmeNodes[oneSignal]
        for connection in node.relatedConnections:
            if connection.destination.GUID == otherSignal or connection.source.GUID == otherSignal:
                return True
        return False

    def __buildSignalAssociations(self): 
        for primitive in self.__outnodes:
            self.__signalAssociations[primitive] = []
            for child in self.__gmeNodes[primitive].children:
                if self.__isInputSignal(child) or self.__isOutputSignal(child):
                    self.__signalAssociations[primitive].append(child.GUID)

            parent = self.__parent[primitive]
            while parent != None:
                for child in self.__gmeNodes[parent].children:
                    if self.__isInputSignal(child) or self.__isOutputSignal(child):
                        toadd = []
                        for signal in self.__signalAssociations[primitive]:
                            if self.__isConnected(signal,child.GUID):
                                toadd.append(child.GUID)
                        self.__signalAssociations[primitive] += toadd
                parent = self.__parent[parent]

    def __addNewEdge(self,source,target):
        for edge in self.__outedges:
            if edge['source'] == source and edge['target'] == target:
                return
        self.__outedges.append({"source":source,"target":target})

    def __createOutEdges(self):
        for node in self.__outnodes:
            for signal in self.__signalAssociations[node]:
                for connection in self.__gmeNodes[signal].relatedConnections:
                    source = False
                    if connection.source.GUID == signal:
                        source = True
                    for othernode in self.__outnodes:
                        if othernode != node:
                            if source and connection.destination.GUID in self.__signalAssociations[othernode]:
                                self.__addNewEdge(node,othernode)
                            elif not source and connection.source.GUID in self.__signalAssociations[othernode]:
                                self.__addNewEdge(othernode,node)


    def writeOut(self):
        g = graphml()
        for node in self.__outnodes:
            g.addNode(node,self.__gmeNodes[node].attributes['name'])
        for edge in self.__outedges:
            g.addEdge(edge['source'],edge['target'])

        g.writeOut(self.__root.attributes['name']+".graphml")

    def test(self):
        print(self.__outnodes)
        print(self.__signalAssociations)
        print(self.__outedges)

