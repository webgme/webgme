import requests
#TODO this is an outdated file, will be updated and maintained in the future.
#constants used throughout the module
COMMAND_PROJECTS = "projects"
COMMAND_BRANCHES = "branches"
COMMAND_NODE     = "node"
COMMAND_COMMIT   = "commit"
COMMAND_COMMITS  = "commits"

REFERENCE_KEY = "$ref"

KEY_ATTRIBUTES = "attributes"
KEY_REGISTRY = "registry"
KEY_POINTERS = "pointers"
KEY_META = "meta"
KEY_CHILDREN = "children"
KEY_GUID = "GUID"
KEY_PARENT = "parent"

TYPE_NODE = 'node'
TYPE_CONNECTION = 'connection'
TYPE_NONE = 'none'

POINTER_SOURCE = 'src'
POINTER_DESTINATION = 'dst'

#libary wide functions
def getType(nodeObject):
    if isinstance(nodeObject,basenode):
        #TODO what should we do in case of multiple types
        #now our priority order is collection -> node
        pointers = nodeObject.outPointers
        if pointers != None:
            if POINTER_SOURCE in pointers.keys() and POINTER_DESTINATION in pointers.keys():
                return TYPE_CONNECTION
        return TYPE_NODE
    elif isinstance(nodeObject, connection):
        return TYPE_CONNECTION
    else:
        return TYPE_NONE
#this class represents the basic HTTP layer
class client:
    def __init__(self,urlBase,token):
        self.__urlBase = urlBase
        self.__authPath = "/login/client"
        self.__checkPath = "/checktoken/"
        self.__tokenPath = "/gettoken"
        self.__restPath = "/rest"
        self.__token = None
        self.__tokenPostfix = None
        self.__session = requests.Session()
        self.__projects = []
        self.__authenticated = False 

        if token != None:
            self.setToken(token)

    # this function authenticates the user, it is only needed our token is not valid
    def authenticate(self):
        username = input("Please enter your login name for webGME server:")
        password = input("Please enter to password associated with the username:")
        response = self.__session.post(self.__urlBase+self.__authPath,dict(username=username,password=password))
        if response.status_code != requests.codes.ok:
            print ("Invalid user credentials!\nExecution stops.")
            quit()
            return False
        
        response = self.__session.get(self.__urlBase+self.__tokenPath)
        if response.status_code == requests.codes.ok:
            print("successfull authentication")
            self.__token = response.content.decode("utf-8")
            self.__authenticated = True
            return True
        elif response.status_code == 410:
            print("successfull authentication")
            self.__token = ""
            self.__tokenPostfix = ""
            self.__authenticated = True
            return True

        print("authentication failed");
        return False
    
    # this function refreshes the token
    def refreshToken(self):
        if self.__authenticated == False:
            if self.authenticate() == False:
                return
        else:
            response = self.__session.get(self.__urlBase+self.__tokenPath)
            if response.status_code == requests.codes.ok:
                self.__token = response.content.decode("utf-8")
                self.__tokenPostfix = "/"
            elif response.status_code == 410:
                self.__token = ""
                self.__tokenPostfix = ""

    #this function gives the token of the user to the user of the library (so it can be than saved and reused)
    def getToken(self):
        if self.__authenticated != True:
            return None
        return self.__token

    #with this function the user can try to set a saved token
    def setToken(self,token):
        response = self.__session.get(self.__urlBase+self.__checkPath+token)
        if response.status_code == requests.codes.ok:
            self.__token = token
            self.__tokenPostfix = "/"
            self.__authenticated = True
            return True
        elif response.status_code == 410:
            self.__token = ""
            self.__tokenPostfix = ""
            self.__authenticated = True
            return True

        return False
    
    #this function tries to connect to the database - if it fail to connect, then it would indicate an authentication
    def connect(self):
        self.refreshToken()
        return database(self)

    #the following functions are try to represent the basic REST commands
    def getProjectList(self):
        response = self.__session.get(self.__urlBase+self.__restPath+'/'+self.__token+self.__tokenPostfix+COMMAND_PROJECTS)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
    def getProjectBranches(self,projectName):
        response = self.__session.get(self.__urlBase+self.__restPath+'/'+self.__token+self.__tokenPostfix+COMMAND_BRANCHES+"/"+projectName)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
    def getCommits(self,projectName,number):
        response = self.__session.get(self.__urlBase+self.__restPath+'/'+self.__token+self.__tokenPostfix+COMMAND_COMMITS+"/"+projectName+'/'+number)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
    def getCommit(self,projectName,commitId):
        response = self.__session.get(self.__urlBase+self.__restPath+'/'+self.__token+self.__tokenPostfix+COMMANDS_COMMIT+"/"+projectName+'/'+commitId)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
    def getURL(self,url):
        if url != None:
            response = self.__session.get(url)
            if response.status_code == requests.codes.ok:
                return response.json()
        return None

# this class is the database which has the project objects
class database:
    def __init__(self,webclient):
        self.__client = webclient
        self.__projects = []
        print(webclient.getToken());

        #now we try to get all the projects we allowed to see
        projs = self.__client.getProjectList()
        if projs == None:
            print ("invalid webclient")
            quit()
        for proj in projs:
            branches = self.__client.getProjectBranches(proj)
            if branches != None:
                self.__projects.append(proj)
    def getProjectList(self):
        return self.__projects;
    def getProject(self,projectName):
        if projectName in self.__projects:
            return project(self.__client,projectName)
        return None

#this is a simple cache class which helps to minimize the loading of nodes
class memorycache:
    def __init__(self,client):
        self.__client = client
        self.__nodes = {}
        self.__guidDir = {}
        self.__connDir = {}
        self.__nodDir = {}

    def getBaseNode(self,referenceObject):
        url = referenceObject[REFERENCE_KEY]
        if url == None:
            return None
        if url in self.__nodes.keys():
            return self.__nodes[url]
        newNode = self.__client.getURL(url)
        if newNode != None:
            newNode = basenode(self.__client,newNode,self)
            self.__guidDir[newNode.guid] = newNode
        self.__nodes[url] = newNode
        return self.__nodes[url]

    def getConnection(self,baseNode):
        if isinstance(baseNode,basenode):
            guid = baseNode.guid
            if guid in self.__connDir.keys():
                return self.__connDir[guid]
            if getType(baseNode) == TYPE_CONNECTION:
                self.__connDir[guid] = connection(baseNode)
                return self.__connDir[guid]
        return None

    def getNode(self,baseNode):
        if isinstance(baseNode,basenode):
            guid = baseNode.guid
            if guid in self.__nodDir.keys():
                return self.__nodDir[guid]
            if getType(baseNode) == TYPE_NODE:
                self.__nodDir[guid] = node(baseNode)
                return self.__nodDir[guid]
        return None

#this represents the project class which is a starting point of a traverse
class project:
    def __init__(self,wClient,pName):
        self.__name = pName
        self.__client = wClient
        self.__commit = None
        self.__branchNames = []
        self.__branches = {}

        branches = self.__client.getProjectBranches(self.__name)
        if branches != None:
            for branch in branches:
                self.__branchNames.append(branch)
                self.__branches[branch] = branches[branch][REFERENCE_KEY]

    def getBranches(self):
        return self.__branchNames

    def getRoot(self,commitId):
        commit = self.__client.getCommit(self.__name,commitId)
        if commit != None:
            jNode = self.__client.getURL(commit['root'][REFERENCE_KEY])
            if jNode != None:
                return basenode(self.__client,jNode,memorycache(self.__client))
        return None

    def getRoot(self,branchName):
        if branchName in self.__branchNames:
            commit = self.__client.getURL(self.__branches[branchName])
            if commit != None:
                jNode = self.__client.getURL(commit['root'][REFERENCE_KEY])
                if jNode != None:
                    return basenode(self.__client,jNode,memorycache(self.__client))
        return None

    def getNode(self,nodeUrl):
        jNode = self.__client.getURL(nodeUrl)
        if jNode != None:
            return basenode(self.__client,jNode,memorycache(self.__client))
        return None

#this is the totally basic node object which gives the simplest interface to check the data in the model
class basenode:
    def __init__(self,wClient,jsonNode,cache):
        self.__client = wClient
        self.__json = jsonNode
        self.__cache = cache
        self.__parent = None
        self.__root = None
        self.__children = None
        self.__outpointers = None
        self.__inpointers = None
        self.__sets = None
        self.__collections = None


    def __getNode(self,referenceObject):
        if self.__cache == None:
            return basenode(self.__client,self.__client.getURL(referenceObject[REFERENCE_KEY]),None)
        return self.__cache.getBaseNode(referenceObject)
    
    def getCache(self):
        return self.__cache

    def getClient(self):
        return self.__client

    @property
    def guid(self):
        return self.__json[KEY_GUID]
    
    @property
    def meta(self):
        return self.__json[KEY_META]
    
    @property
    def attributes(self):
        return self.__json[KEY_ATTRIBUTES]

    @property
    def registry(self):
        return self.__json[KEY_REGISTRY]

    @property
    def parent(self):
        if self.__parent == None:
            parentNode = self.__getNode(self.__json[KEY_PARENT])
            if parentNode != None:
                self.__parent = parentNode
        return self.__parent
    
    @property
    def root(self):
        if self.__root == None:
            node = self
            while node.parent != None:
                node = node.parent
            self.__root = node
        return self.__node

    @property
    def children(self):
        if self.__children == None:
            self.__children = []
            for child in self.__json[KEY_CHILDREN]:
                childNode = self.__getNode(child)
                if childNode != None:
                    self.__children.append(childNode)
        return self.__children

    @property
    def outPointers(self):
        if self.__outpointers == None:
            self.__outpointers = {}
            for pointerName in self.__json[KEY_POINTERS]:
                if self.__json[KEY_POINTERS][pointerName]["set"] != True:
                    pointerNode = None
                    if len(self.__json[KEY_POINTERS][pointerName]["to"]) == 1:
                        pointerNode = self.__getNode(self.__json[KEY_POINTERS][pointerName]["to"][0])
                    if pointerNode != None:
                        self.__outpointers[pointerName] = pointerNode

        return self.__outpointers

    @property
    def inPointers(self):
        if self.__inpointers == None:
            self.__inpointers = {}
            for pointerName in self.__json[KEY_POINTERS]:
                if self.__json[KEY_POINTERS][pointerName]["set"] != True:
                    if len(self.__json[KEY_POINTERS][pointerName]["from"]) > 0:
                        self.__inpointers[pointerName] = []
                        for index in self.__json[KEY_POINTERS][pointerName]["from"]:
                            pointerNode = self.__getNode(index)
                            if pointerNode != None:
                                self.__inpointers[pointerName].append(pointerNode)

        return self.__inpointers


    @property
    def sets(self):
        if self.__sets == None:
            self.__sets = {}
            for pointerName in self.__json[KEY_POINTERS]:
                if self.__json[KEY_POINTERS][pointerName]["set"] == True:
                    self.__sets[pointerName] = []
                    for index in self.__json[KEY_POINTERS][pointerName]["to"]:
                        pointerNode = self.__getNode(index)
                        if pointerNode != None:
                            self.__sets[pointerName].append(pointerNode)
        return self.__sets

    @property
    def collections(self):
        if self.__collections == None:
            self.__collections = {}
            for pointerName in self.__json[KEY_POINTERS]:
                if self.__json[KEY_POINTERS][pointerName]["set"] == True:
                    if len(self.__json[KEY_POINTERS][pointerName]["from"]) > 0:
                        self.__sets[pointerName] = []
                        for index in self.__json[KEY_POINTERS][pointerName]["from"]:
                            pointerNode = self.__getNode(index)
                            if pointerNode != None:
                                self.__sets[pointerName].append(pointerNode)
        return self.__collections


#this node class has the knowledge of connections and references so it can have nicer API - gives back type filterable lists and dictionaries
class node:
    def __init__(self,baseNode):
        self.__base = baseNode
        self.__cache = baseNode.getCache()
        self.__client = baseNode.getClient()
        self.__children = None
        self.__outpointers = None
        self.__inpointers = None
        self.__sets = None
        self.__collections = None
        self.__tanconns = None
        self.__baseNode = None
    
    #this function always returns a typed gme object (node / connection)
    def __getNode(self,base):
        
        type = getType(base)

        if type == TYPE_CONNECTION:
            if self.__cache == None:
                return connection(base)
            else:
                return self.__cache.getConnection(base)
        elif type == TYPE_NODE:
            if self.__cache == None:
                return node(base)
            else:
                return self.__cache.getNode(base)
        else:
            return base

    def getBaseNode(self):
        return self.__base
    
    @property
    def guid(self):
        return self.__base.guid
    
    @property
    def parent(self):
        return self.__getNode(self.__base.parent)

    @property
    def root(self):
        return self.__base.root

    @property
    def base(self):
        if self.__baseNode == None:
            pointers = self.outPointers
            if "base" in pointers.keys():
                self.__baseNode = pointers["base"]
        return self.__baseNode

    @property
    def attributes(self):
        return self.__base.attributes

    @property
    def registry(self):
        return self.__base.registry

    @property
    def children(self):
        if self.__children == None:
            self.__children = []
            children = self.__base.children
            for child in children:
                self.__children.append(self.__getNode(child))
        return self.__children

    @property
    def outPointers(self):
        if self.__outpointers == None:
            self.__outpointers = {}
            outpointers = self.__base.outPointers
            for pointerName in outpointers:
                self.__outpointers[pointerName] = self.__getNode(outpointers[pointerName])
        return self.__outpointers

    @property
    def inPointers(self):
        if self.__inpointers == None:
            self.__inpointers = {}
            inpointers = self.__base.inPointers
            for pointerName in inpointers:
                self.__inpointers[pointerName] = []
                for index in inpointers[pointerName]:
                    self.__inpointers[pointerName].append(self.__getNode(index))

        return self.__inpointers


    @property
    def sets(self):
        if self.__sets == None:
            self.__sets = {}
            sets = self.__base.sets
            for pointerName in sets:
                self.__sets[pointerName] = []
                for index in sets[pointerName]:
                    self.__sets[pointerName].append(self.__getNode(index))
        return self.__sets

    @property
    def collections(self):
        if self.__collections == None:
            self.__collections = {}
            collections = self.__base.collections
            for pointerName in collections:
                self.__collections[pointerName] = []
                for index in collections[pointerName]:
                    self.__collections[pointerName].append(self.__getNode(index))
        return self.__collections

    @property
    def relatedConnections(self):
        if self.__tanconns == None:
            self.__tanconns = []
            inpointers = self.inPointers
            if POINTER_SOURCE in inpointers:
                for conn in inpointers[POINTER_SOURCE]:
                    self.__tanconns.append(conn)
            if POINTER_DESTINATION in inpointers:
                for conn in inpointers[POINTER_DESTINATION]:
                    self.__tanconns.append(conn)

        return self.__tanconns



#this is a suer class of the basic node with some extended functions
class connection(node):
    def __init__(self,baseNode):
        self.__endpoints = None
        node.__init__(self,baseNode)

    @property
    def source(self):
        outpointers = self.outPointers
        return outpointers[POINTER_SOURCE]

    @property
    def destination(self):
        outpointers = self.outPointers
        return outpointers[POINTER_DESTINATION]
    
    @property
    def endpoints(self):
        if self.__endpoints == None:
            self.__endpoints = []
            self.__endpoints.append(self.source)
            self.__endpoints.append(self.destination)
        return self.__endpoints
