import requests
from database import database

COMMAND_PROJECTS = "/projects"
COMMAND_BRANCHES = "/branches"
COMMAND_NODE     = "/node"
COMMAND_COMMIT   = "/commit"
COMMAND_COMMITS  = "/commits"

class webclient:
    def __init__(self):
        self.__urlBase = "http://localhost"
        self.__authPath = "/login/client"
        self.__checkPath = "/checktoken/"
        self.__tokenPath = "/gettoken"
        self.__restPath = "/rest"
        self.__token = None
        self.__session = requests.Session()
        self.__projects = []
        self.__authenticated = False 

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

        print("authentication failed");
        return False
    
    # this function refreshes the token
    def refreshToken(self):
        if self.__authenticated == False:
            if self.authenticate() == False:
                return
        else:
            response = self.__session.get(self.__urlBase+self.__tokenPath)
            if response.status_code != requests.codes.ok:
                self.__token = response.content.decode("utf-8")

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
            self.__authenticated = True
            return True
        return False
    
    #this function tries to connect to the database - if it fail to connect, then it would indicate an authentication
    def connect(self):
        self.refreshToken()
        return database(self)

    #the following functions are try to represent the basic REST commands
    def getProjectList(self):
        response = self.__session.get(self.__urlBase+self.__restPath+'/'+self.__token+COMMAND_PROJECTS)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
    def getProjectBranches(self,projectName):
        response = self.__session.get(self.__urlBase+self.__restPath+'/'+self.__token+COMMAND_BRANCHES+"/"+projectName)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
    def getCommits(self,projectName,number):
        response = self.__session.get(self.__urlBase+self.__restPath+'/'+self.__token+COMMAND_COMMITS+"/"+projectName+'/'+number)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
    def getCommit(self,projectName,commitId):
        response = self.__session.get(self.__urlBase+self.__restPath+'/'+self.__token+COMMANDS_COMMIT+"/"+projectName+'/'+commitId)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
    def getURL(self,url):
        response = self.__session.get(url)
        if response.status_code == requests.codes.ok:
            return response.json()
        return None
