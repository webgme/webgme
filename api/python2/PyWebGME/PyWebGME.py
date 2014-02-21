import webgme

try:
    w = webgme.client("http://localhost","078dd342-6695-af73-b4cc-90aeb4820feetoken")
    #w = webgme.client("http://localhost","1504070a-d60c-9eaa-a6e0-9c0ddbb5e444token")

    db = w.connect()

    plist = db.getProjectList()

    def recPrint(item, indent):
        print (indent+item.attributes["name"]+"  "+str(type(item)))
        children = item.children
        for child in children:
            recPrint(child,indent+"  ")

    if len(plist) > 0:
        print("available projects:")
        for i,j in enumerate(plist):
            print(str(i)+". "+j)
        index = input("please enter the number which project you want to open (to exit input an invalid value):")
        index = int(index)
        if index >=0 and index < len(plist):
            project = db.getProject(plist[index])
            root = project.getRoot("master")
            rootNode = webgme.node(root)
            recPrint(rootNode,"");
        else:
            exit()
    else:
        print("there is no available project, program stops")
        exit()
except SystemExit as e:
    if not e.code == None:
         print(e);

