REFERENCE_KEY = "$ref"
from node import node
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
            print (commit)
    def getRoot(self,branchName):
        if branchName in self.__branchNames:
            commit = self.__client.getURL(self.__branches[branchName])
            if commit != None:
                jNode = self.__client.getURL(commit['root'][REFERENCE_KEY])
                if jNode != None:
                    return node(self.__client,jNode)
        return None