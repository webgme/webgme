KEY_ATTRIBUTES = "attributes"
KEY_REGISTRY = "registry"
KEY_POINTERS = "pointers"
KEY_META = "meta"
KEY_CHILDREN = "children"
REFERENCE_KEY = "$ref"
class node:
    def __init__(self,wClient,jsonNode):
        self.__client = wClient
        self.__json = jsonNode
        self.__children = None
        self.__pointers = None

    @property
    def attributes(self):
        return self.__json[KEY_ATTRIBUTES]

    @property
    def registry(self):
        return self.__json[KEY_REGISTRY]

    @property
    def children(self):
        if self.__children == None:
            #we load the chlidren
            self.__children = []
            for child in self.__json[KEY_CHILDREN]:
                jChild = self.__client.getURL(child[REFERENCE_KEY])
                if jChild != None:
                    self.__children.append(node(self.__client,jChild))
            return self.__children

    @property
    def pointers(self):
        return self.__json[KEY_POINTERS]

