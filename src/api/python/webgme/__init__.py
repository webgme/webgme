"""

WebGME API module. Provides basic API functionality to read/write/manipulate objects on a WebGME server.

Copyright (C) 2013 Vanderbilt University, All rights reserved.

"""

__author__ = 'Zsolt Lattmann'


from cookielib import CookieJar
import logging
import urllib2
import json

# create logger with 'webgmeapi'
logger = logging.getLogger('webgmeapi')
logger.setLevel(logging.DEBUG)

# create file handler which logs even debug messages
fh = logging.FileHandler('webgmeapi.log')
fh.setLevel(logging.DEBUG)

# create console handler with a higher log level
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)

# create formatter and add it to the handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
ch.setFormatter(formatter)

# add the handlers to the logger
logger.addHandler(fh)
logger.addHandler(ch)


class Client(object):
    """ Opens and manages the connection to the WebGME server. """

    # Global static variables - url constants
    REST = 'rest'
    PROJECTS = 'projects'
    BRANCHES = 'branches'

    def __init__(self, server_base_url, credential=None):

        # set url and credentials
        self._server_base_url = server_base_url
        self._credential = credential

        self._rest_url = self._server_base_url + '/' + self.REST

        # create cookie handler
        self._cookie_jar = CookieJar()

        # set up cookie handler
        self._opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(self._cookie_jar))

        # get cookies
        logger.info('Get cookies')
        response = self.GET(self.PROJECTS)  # TODO: get auth page instead

        # TODO: login
        # TODO: make sure we logged in

    def __del__(self):
        """ Logout from session. Closes all handles/connections/sockets. """
        # TODO: logout
        pass
        logger.info('Logout')

    def DELETE(self, *args):
        """ Sends a HTTP DELETE request to a url specified as arguments. """
        return self._open('DELETE', *args)

    def GET(self, *args):
        """ Sends a HTTP GET request to a url specified as arguments. """
        return self._open('GET', *args)

    def POST(self, *args, **data):
        """ Sends a HTTP POST request with data to a url specified as arguments. """
        return self._open('POST', *args, **data)

    def PUT(self, *args, **data):
        """ Sends a HTTP PUT request with data to a url specified as arguments. """
        return self._open('PUT', *args, **data)

    def _open(self, method, *args, **data):
        """ Form and log the requests/methods to the server. """
        # concatenate request url
        url = ''
        if len(args) > 0:
            url = '/'.join(args)
        request_url = self._rest_url + '/' + url

        # log request
        logger.debug('{0} {1}'.format(method, request_url))

        # get data string from dictionary if any
        data_string = None
        if data:
            data_string = json.dumps(data)

        # prepare request url and data
        request = urllib2.Request(request_url, data=data_string)

        # set 'get_method' DELETE/GET/POST/PUT
        request.get_method = lambda: method

        # open url and send data if any
        response = self.opener.open(request)

        # get the response from the server
        content = response.read()

        # log the response
        logger.debug(content)

        # parse the response and return it
        parsedResponse = json.loads(content)
        if parsedResponse['error']:
            print parsedResponse['msg']
            return None
        else:
            return parsedResponse['data']
        

    @property
    def opener(self):
        """ Handles cookies and login information every request is sent through this funciton. """
        return self._opener

    @property
    def server_base_url(self):
        """ Url connection string to the server e.g. http://localhost:8888 """
        return self._server_base_url

    @property
    def credential(self):
        """ User login information. """
        return self._credential

    @property
    def projects(self):
        """ Returns with all projects on the server. """
        for project_name in self.GET(self.PROJECTS):
            yield Project(self, project_name)


class Project(object):
    """ WebGME project object gives access to branches and project properties."""
    def __init__(self, client, name):
        self._client = client
        self._name = name

    @property
    def client(self):
        """ Connection/communication object. """
        return self._client

    @property
    def name(self):
        """ Name of the project. """
        return self._name

    @property
    def branches(self):
        """ Returns with all branches as Branch objects within this project. """
        branches_response = self.client.GET(self.name, Client.BRANCHES)
        for branch_name in branches_response:
            yield Branch(self, branch_name)


class Branch(object):
    """ WebGME branch object. Manages branches and commits (changes) of gme objects. """
    def __init__(self, project, name, branch_hash=None):
        self._project = project
        self._name = name

        if not branch_hash:
            branch_hash = self.project.client.GET(self.project.name, Client.BRANCHES)[name]

        self._original_hash = branch_hash
        self.current_hash = self._original_hash

    def DELETE(self, *args):
        """ HTTP DELETE requests for this branch. """
        response = self.project.client.DELETE(self.project.name, *args)
        self._current_hash = response
        return response

    def GET(self, *args):
        """ HTTP GET requests for this branch. """
        return self.project.client.GET(self.project.name, *args)

    def POST(self, *args, **data):
        """ HTTP POST requests for this branch. """
        response = self.project.client.POST(self.project.name, *args, **data)
        if response:
            self._current_hash = response['commit']
            return response['node']
        else:
            return None

    def PUT(self, *args, **data):
        """ HTTP PUT requests for this branch. """
        response = self.project.client.PUT(self.project.name, *args, **data)
        self._current_hash = response['commit']
        return response['node']

    # def commit(self):
    #     raise NotImplementedError
    #
    # def merge(self):
    #     raise NotImplementedError

    @property
    def original_hash(self):
        """ Returns with the original hash of the branch when the branch was opened. """
        return self._original_hash

    @property
    def current_hash(self):
        """ Returns with the current hash after any modifications. """
        return self._current_hash

    @current_hash.setter
    def current_hash(self, value):
        """ Sets the current hash. """
        self._current_hash = value
        self._root = Node(self)

    @property
    def project(self):
        """ Gets the project for this branch. """
        return self._project

    @property
    def root(self):
        """ Gets the root object of this branch. """
        return self._root

    @property
    def name(self):
        """ Gets the name of the branch. """
        return self._name
        
    def save(self):
        """ Updates the branch on the server. """
        if self.current_hash != self.original_hash:
            updatecommit = {
                'newhash':self.current_hash,
                'oldhash':self.original_hash
            }
            self.POST(self._name, **updatecommit)
            self._original_hash = self.current_hash


class Node(object):
    """ WebGME Node object. Gives access to a given object and its properties/relationships. """

    # Global static variables - given by the WebGME HTTP responses
    ATTRIBUTE_KEY = 'attribute'
    POINTER_KEY = 'pointer'
    REGISTRY_KEY = 'registry'
    COLLECTION_KEY = 'collection'
    CHILDREN_KEY = 'children'
    SETS_KEY = 'sets'
    MEMBER_KEY = 'member'

    NAME_KEY = 'name'

    # Global static variables - default values
    NAME_DEFAULT = 'csak'

    # Global static variables - default new node
    DEFAULT = {
        ATTRIBUTE_KEY: {NAME_KEY: NAME_DEFAULT},
        POINTER_KEY: {},
        REGISTRY_KEY: {},
        COLLECTION_KEY: {},
        CHILDREN_KEY: [],
        SETS_KEY: {},
        MEMBER_KEY: {}
    }

    def __init__(self, branch, path='', node = None):
        """ Creates a new Node object given a Branch object and a relative node id within the branch. """
        # set branch object
        self._branch = branch
        
        # set relative id
        self._path = path

        # get the JSON representation of this object from the server
        if node:
            self._node_obj = node
        else:
            self._node_obj = self.GET()

        # healthy
        self._status = True

    def DELETE(self):
        """ HTTP DELETE for this node object. """
        return self.branch.DELETE(self.branch.current_hash + self.path)

    def GET(self):
        """ HTTP GET for this node object. """
        return self.branch.GET(self.branch.current_hash + self.path)

    def POST(self, *args, **data):
        """ HTTP POST for this node object. """
        return self.branch.POST(self.branch.current_hash + self.path, *args, **data)

    def PUT(self, *args, **data):
        """ HTTP PUT for this node object. """
        return self.branch.PUT(self.branch.current_hash + self.path, *args, **data)

    def create(self, data=None):
        """ Creates a new node as a child of this one. Returns with the new Node object. """
        # get the default data for creation
        request_data = Node.DEFAULT.copy()

        # if callee specifies data update the default with the given data
        if data:
            request_data.update(data)

        # send the create request to the server
        new_node = self.PUT(**request_data)
        # update this node object (NOT the newly created one!)
        self._node_obj = self.GET()

        return Node(self.branch, new_node['path'],new_node)

    def delete(self):
        """ Deletes this object. Further access is not allowed. """
        self._status = False
        self.DELETE()

    def set(self, *args, **kwargs):
        """ Sets the object's properties: attribute, registry, pointer. Overwrite and delete on properties."""
        self._node_obj.set(args, kwargs)
        self.POST(self._node_obj)
        self._node_obj = self.GET()
        return self

    def update(self, *args, **kwargs):
        """ Updates the object's properties: attribute, registry, pointer. """
        self._node_obj.update(args, kwargs)
        self.POST(self._node_obj)
        self._node_obj = self.GET()
        return self

    @property
    def status(self):
        """ If status is True the object is 'active' otherwise it is deleted and return value is False. """
        return self._status

    @property
    def branch(self):
        """ Returns with the current branch object. """
        return self._branch

    @property
    def path(self):
        """ Returns with the rel_id of this object. This is the primary identifier of the object. """
        return self._path

    @property
    def name(self):
        """ Gets the name of this node object. If name is not set returns with the default value (empty string). """
        # set the default name value
        name = Node.NAME_DEFAULT

        # try to get the name of this object from the attributes
        attributes = self.attribute
        if Node.NAME_KEY in attributes:
            name = attributes[Node.NAME_KEY]
        return name

    @name.setter
    def name(self, value):
        """ Sets the name of this node object. """
        self.attribute[Node.NAME_KEY] = value

    @property
    def parent(self):
        """ Gets the parent node. Returns with a Node object if the parent is not the 'root' otherwise None. """
        raise NotImplementedError

    @property
    def attribute(self):
        # get update from server
        self._node_obj = self.GET()
        return CollectionDict(self, Node.ATTRIBUTE_KEY)

    @property
    def registry(self):
        # get update from server
        self._node_obj = self.GET()
        return CollectionDict(self, Node.REGISTRY_KEY)

    @property
    def children(self):
        # get update from server
        self._node_obj = self.GET()
        for child_path in self._node_obj[Node.CHILDREN_KEY]:
            yield Node(self.branch, child_path)

    @property
    def pointer(self):
        # get update from server
        self._node_obj = self.GET()
        # TODO: resolve rel_ids
        return CollectionDict(self, Node.POINTER_KEY)

    @property
    def collection(self):
        # get update from server
        self._node_obj = self.GET()
        # TODO: resolve rel_ids
        return CollectionDict(self, Node.COLLECTION_KEY)

    @property
    def sets(self):
        # get update from server
        self._node_obj = self.GET()
        # TODO: resolve rel_ids
        return CollectionDict(self, Node.SETS_KEY)

    @property
    def member(self):
        # get update from server
        self._node_obj = self.GET()
        # TODO: resolve rel_ids
        return CollectionDict(self, Node.MEMBER_KEY)

    @property
    def __json__(self):
        """ Returns with the JSON representation of this node object i.e. same as server response. """
        # get update from server
        self._node_obj = self.GET()
        return self._node_obj


class CollectionDict(dict):
    """ Wrapper for attribute and registry collections. They can be read and written as dictionary object and this
        class handles updates to keep it sync with the server.
    """
    def __init__(self, node, collection_name, *args, **kwargs):
        super(CollectionDict, self).__init__()

        # underlying node object
        self._node = node

        # name of the wrapped collection
        self._collection_name = collection_name

        # update this dictionary with the underlying key value pairs
        self.update(self._node._node_obj[self._collection_name])

        # update this dictionary with the initializer key value pairs
        self.update(*args, **kwargs)

    def __setitem__(self, key, value):
        """ Sets a key to a new value in the dictionary. """
        # update the value in this dictionary
        dict.__setitem__(self, key, value)

        # update the value in the underlying node object
        dict.__setitem__(self._node._node_obj[self._collection_name], key, value)

        # update the values on the server
        self._node.POST(**self._node._node_obj)
