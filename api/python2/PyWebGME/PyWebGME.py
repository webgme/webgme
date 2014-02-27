import webgme
import sys
import json
from graphml import graphml
import sf2graph
try:

    config = {}
    if len(sys.argv) == 2:
        cFile = open(sys.argv[1])
        config = json.load(cFile)
        cFile.close()
        print(config)

    pName = None
    mName = None
    bName = None
    token = None
    host = None
    commit = None
    if 'project' in config.keys():
        pName = config['project']
    if 'model' in config.keys():
        mName = config['model']
    if 'branch' in config.keys():
        bName = config['branch']
    if 'token' in config.keys():
        token = config['token']
    if 'host' in config.keys():
        host = config['host']
    if 'commit' in config.keys():
        commit = config['commit']

    if pName != None and mName != None and (bName != None or commit != None) and token and host:
        print('configuration read successfully')
        print('starting to generate graphml file')
        w = webgme.client(host,token)
        db = w.connect()
        plist = db.getProjectList()
        graph = graphml()
        project = db.getProject(pName)
        if project != None:
            if bName != None:
                root = project.getRoot(bName)
            else:
                root = project.getRoot(commit)
            if root != None:
                rootNode = webgme.node(root)
                mychild = None
                for child in rootNode.children:
                    if child.attributes['name'] == mName:
                        mychild = child
                if mychild != None:
                    g = sf2graph.SignalFlowToGraphML(mychild)
                    g.writeOut()
                    print('file generation completed')
                else:
                    print('the model is missing')
            else:
                print('cannot find the given branch or commit')
        else:
            print('unable to find project')
    else:
        print("the given configuration is unusable!!")
except SystemExit as e:
    if not e.code == None:
         print(e);

