__author__ = 'Zsolt'


from webgme import WebGmeAccess

webGmeAccess = WebGmeAccess('http://localhost:8888')

projects = webGmeAccess.get_projects()

if len(projects) > 0:
    project = projects[0]
    #for project in projects:
    print 'Project: ' + project
    branches = webGmeAccess.get_branches(project)
    for branch in branches:
        commit_hash = branches[branch]
        root = webGmeAccess.get_object(project, commit_hash)


        #new_commit_hash = webGmeAccess.create_node(project, commit_hash)
        #print new_commit_hash

        data = {"attribute": {"name": "new_222"}}

        #new_commit_hash = webGmeAccess.update_node(project, commit_hash)
        #print new_commit_hash

        root = webGmeAccess.get_object(project, '%23aaa9af7578234124d74febea0714faa9b8a0d5e8')
        for child in webGmeAccess.get_children(project, '%23aaa9af7578234124d74febea0714faa9b8a0d5e8', root):
            print child
            if 'attribute' in child and 'name' in child['attribute'] and child['attribute']['name'] == "new_node":
                commit_hash = webGmeAccess.delete_node(project, '%23aaa9af7578234124d74febea0714faa9b8a0d5e8', child['relid'])
                print commit_hash
                break

                #'#aaa9af7578234124d74febea0714faa9b8a0d5e8'

        # get children
        # for child in webGmeAccess.get_children(project, commit_hash, root):
            #print child
            #print webGmeAccess.get_children(project, commit_hash, child)

