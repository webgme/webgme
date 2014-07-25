import sys
import json

from src.api.python2.PyWebGME import sfs2graphs
import webgme
from graphml import graphml


try:

    config = {}
    if len(sys.argv) == 2:
        cFile = open(sys.argv[1])
        config = json.load(cFile)
        cFile.close()
        print(config)

    pName = None
    mUrl = None
    bName = None
    token = None
    host = None
    commit = None
    rUrl = None
    if 'project' in config.keys():
        pName = config['project']
    if 'selected' in config.keys():
        mUrl = config['selected']
    if 'branch' in config.keys():
        bName = config['branch']
    if 'token' in config.keys():
        token = config['token']
    if token == None:
        token = ""
    if 'host' in config.keys():
        host = config['host']
    if 'commit' in config.keys():
        commit = config['commit']
    if 'root' in config.keys():
        commit = config['root']

    if pName != None and mUrl != None and token != None and host != None:
        print('configuration read successfully')
        print('starting to generate graphml file')
        w = webgme.client(host,token)
        db = w.connect()
        plist = db.getProjectList()
        graph = graphml()
        project = db.getProject(pName)
        if project != None:
            if mUrl != None:
                model = project.getNode(mUrl)
                modelNode = webgme.node(model)
                g = sfs2graphs.SignalFlowSystemToGraphML(modelNode)
                print('file generation completed')
            else:
                print('there is no selected model in the configuration')
        else:
            print('unable to find project')
    else:
        print("the given configuration is unusable!!")
except SystemExit as e:
    if not e.code == None:
         print(e);

