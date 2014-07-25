from src.api.python2.PyWebGME import graphml, webgme


class SignalFlowSystemToGraphML:
    def __init__(self,rootNode):
        self.__root = rootNode
        self.__gmeNodes = {}
        self.__gmeConnections = []
        self.__signalAssociations = {}
        self.__outnodes = []
        self.__intermediatenodes = []
        self.__outedges = []
        self.__parent = {}

        if self.__isSignalFlowSystem(rootNode):
            for child in rootNode.children:
                if self.__isHardwareComponent(child):
                    print(child.attributes['name'])
                    self.__createSingleHWCompGraph(child)
        elif self.__isCompound(rootNode):
            self.__createSingleCompoundGraph(rootNode)
        else:
            print("wrong input for the plugin")
        


    def __loadSetMembers(self,node):
        if 'assign' in node.sets.keys():
            for member in node.sets['assign']:
                self.__parent[member.guid] = None
                self.__loadGMENodes(member)
            #now we should add all flow connections between the already loaded top level nodes
            checkedParents = []
            for member in node.sets['assign']:
                parent = member.parent
                if not (parent.guid in self.__gmeNodes.keys() or parent.guid in checkedParents):
                    checkedParents.append(parent.guid)
                    for child in parent.children:
                        if self.__isDataFlowConn(child) and child.source.guid in self.__gmeNodes and child.destination.guid in self.__gmeNodes:
                            self.__gmeNodes[child.guid] = child
                            self.__parent[child.guid] = None

    def __loadGMENodes(self,node):
        if not node.guid in self.__gmeNodes.keys():
            self.__gmeNodes[node.guid] = node
        for child in node.children:
            self.__parent[child.guid] = node.guid
            self.__loadGMENodes(child)

    def __clearStoredData(self):
        self.__gmeNodes = {}
        self.__gmeConnections = []
        self.__signalAssociations = {}
        self.__outnodes = []
        self.__intermediatenodes = []
        self.__outedges = []
        self.__parent = {}
        self.__parent[self.__root.guid] = None

    def __createSingleHWCompGraph(self,node):
        self.__root = node
        self.__clearStoredData()
        if 'ref' in node.inPointers.keys():
            for pointer in node.inPointers['ref']:
                self.__loadSetMembers(pointer)
        
        self.__getOutNodes()
        self.__getIntermediateNodes()
        self.__getGMEConnections()
        self.__createBasicEdges()
        for guid in self.__intermediatenodes:
            self.__outedges = self.__removeIntermediateNode(guid)
        self.writeOut()

    def __createSingleCompoundGraph(self,node):
        self.__root = node
        self.__clearStoredData()
        self.__loadGMENodes(node)
        self.__getOutNodes()
        self.__getIntermediateNodes()
        self.__getGMEConnections()
        self.__createBasicEdges()
        for guid in self.__intermediatenodes:
            self.__outedges = self.__removeIntermediateNode(guid)
        self.writeOut()

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
        if 'Input' in self.__getBaseNameList(node):
            return True
        return False
    def __isOutputSignal(self,node):
        if 'Output' in self.__getBaseNameList(node):
            return True
        return False
    def __isDataFlowConn(self,node):
        if 'Flow' in self.__getBaseNameList(node):
            return True
        return False
    def __isHardwareComponent(self,node):
        if 'HWNode' in self.__getBaseNameList(node):
            return True
        return False
    def __isSignalFlowSystem(self,node):
        if 'HardwareModel' in self.__getBaseNameList(node):
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
            if isinstance(self.__gmeNodes[guid], webgme.connection):
                self.__gmeConnections.append(guid);

    def __createBasicEdges(self):
        for guid in self.__gmeConnections:
            conn = self.__gmeNodes[guid]
            if conn.source.guid in self.__intermediatenodes:
                parent = self.__parent[conn.destination.guid]
                if conn.destination.guid in self.__intermediatenodes:
                    self.__outedges.append({'source':conn.source.guid,'target':conn.destination.guid})
                elif parent in self.__outnodes or parent in self.__intermediatenodes:
                    self.__outedges.append({'source':conn.source.guid,'target':parent})
                else:
                    print('DEBUG:how this can happened -1- ???')
            elif conn.destination.guid in self.__intermediatenodes:
                parent = self.__parent[conn.source.guid]
                if parent in self.__outnodes or parent in self.__intermediatenodes:
                    self.__outedges.append({'source':parent,'target':conn.destination.guid})
                else:
                    print('DEBUG:how this can happened -2- ???')
            else: #both end of the connection belongs to a primitive
                sparent = self.__parent[conn.source.guid]
                tparent = self.__parent[conn.destination.guid]
                if sparent in self.__outnodes and tparent in self.__outnodes:
                    self.__outedges.append({'source':sparent,'target':tparent})
                else:
                    print('DEBUG:how this can happened -3- ???') 

    def __isConnected(self,oneSignal, otherSignal):
        node = self.__gmeNodes[oneSignal]
        for connection in node.relatedConnections:
            if connection.destination.guid == otherSignal or connection.source.guid == otherSignal:
                return True
        return False

    def __buildSignalAssociations(self): 
        for primitive in self.__outnodes:
            self.__signalAssociations[primitive] = []
            for child in self.__gmeNodes[primitive].children:
                if self.__isInputSignal(child) or self.__isOutputSignal(child):
                    self.__signalAssociations[primitive].append(child.guid)

            parent = self.__parent[primitive]
            while parent != None:
                for child in self.__gmeNodes[parent].children:
                    if self.__isInputSignal(child) or self.__isOutputSignal(child):
                        toadd = []
                        for signal in self.__signalAssociations[primitive]:
                            if self.__isConnected(signal,child.guid):
                                toadd.append(child.guid)
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
                    if connection.source.guid == signal:
                        source = True
                    for othernode in self.__outnodes:
                        if othernode != node:
                            if source and connection.destination.guid in self.__signalAssociations[othernode]:
                                self.__addNewEdge(node,othernode)
                            elif not source and connection.source.guid in self.__signalAssociations[othernode]:
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

