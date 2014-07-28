from src.api.python import webgme

__author__ = 'Zsolt Lattmann'

access = webgme.Client('http://localhost:8888')

for project in access.projects:
    print project.name

    if project.name == 'python_api_test':
        for branch in project.branches:
            print branch.name
            root = branch.root
            print root._node_obj
            attrs = root.attribute
            for attr in attrs:
                print '%s = %s' % (attr, attrs[attr])

            attrs['fake'] = 'Some dummy value'

            new_node = root.create()
            #new_node.attribute[webgme.Node.NAME_KEY] = 'new node'

            print root._node_obj
            for child in root.children:
                #child.name = 'here is a new object'
                print child.__json__
            
            # save the updates            
            branch.save()