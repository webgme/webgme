from project import project
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
    def getProject(self,projectName):
        if projectName in self.__projects:
            return project(self.__client,projectName)
        return None





