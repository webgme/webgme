__author__ = 'Zsolt'

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


class WebGmeAccess(object):
    opener = None  # opens any urls using this object
    cookie_jar = None  # manages the cookies

    url = None  # base url instance of WebGme
    credential = None

    username = None

    rest_url = None

    # constants
    REST = '/rest'
    PROJECTS = '/projects'
    BRANCHES = '/branches'

    def __init__(self, url, credential=None):
        self.url = url
        self.credential = credential

        self.rest_url = self.url + self.REST

        # create cookie handler
        self.cookie_jar = CookieJar()

        # set up cookie handler
        self.opener = urllib2.build_opener(urllib2.HTTPCookieProcessor(self.cookie_jar))

        # get cookies
        logger.info('Get cookies')
        response = self.opener.open(self.rest_url + self.PROJECTS)  # TODO: get auth page instead
        response.read()

        # TODO: login
        # TODO: make sure we logged in

    def __del__(self):
        # TODO: logout
        pass
        logger.info('Logout')

    def get_projects(self):
        logger.info('Get projects')
        response = self.get_rest(self.PROJECTS)
        return response

    def get_branches(self, project):
        logger.info('Get branches for "{0}" project.'.format(project))
        response = self.get_rest(project + self.BRANCHES)
        return response

    def get_object(self, project, commit_hash, rel_id=''):
        logger.info('Get object for "{0}" project, root: "{1}", rel_id: "{2}".'.format(project, commit_hash, rel_id))
        response = self.get_rest(project + '/' + commit_hash + rel_id)
        return response

    def get_children(self, project, commit_hash, obj):
        logger.info('Get children for "{0}" project, object: "{1}".'.format(project, obj))

        if 'children' in obj:
            for rel_id in obj['children']:
                try:
                    response = self.get_rest(project + '/' + commit_hash + rel_id)
                    #  FIXME: how to get relid?
                    response.update({'relid': rel_id})
                    if response:
                        #result.append(response)
                        yield response
                except urllib2.HTTPError as ex:
                    logger.error('{0}'.format(ex))

    def get_rest(self, request_url):
        if request_url[0] != '/':
            request_url = '/' + request_url
        logger.debug('GET {0}.'.format(self.rest_url + request_url))
        response = self.opener.open(self.rest_url + request_url)
        content = response.read()
        logger.debug(content)
        return json.loads(content)

    def put_rest(self, request_url, data):
        if request_url[0] != '/':
            request_url = '/' + request_url
        logger.debug('PUT {0}.'.format(self.rest_url + request_url))

        request = urllib2.Request(self.rest_url + request_url, data=data)
        request.add_header('Content-Type', 'application/json')
        request.get_method = lambda: 'PUT'

        response = self.opener.open(request)

        content = response.read()
        logger.debug(content)
        return json.loads(content)

    def post_rest(self, request_url, data):
        if request_url[0] != '/':
            request_url = '/' + request_url
        logger.debug('POST {0}.'.format(self.rest_url + request_url))

        request = urllib2.Request(self.rest_url + request_url, data=data)
        request.add_header('Content-Type', 'application/json')
        request.get_method = lambda: 'POST'

        response = self.opener.open(request)

        content = response.read()
        logger.debug(content)
        return json.loads(content)

    def delete_rest(self, request_url):
        if request_url[0] != '/':
            request_url = '/' + request_url
        logger.debug('DELETE {0}.'.format(self.rest_url + request_url))

        request = urllib2.Request(self.rest_url + request_url)
        request.get_method = lambda: 'DELETE'

        response = self.opener.open(request)

        content = response.read()
        logger.debug(content)
        return json.loads(content)

    def create_node(self, project, commit_hash, rel_id='', data={"attribute": {"name": "new_node"}, "pointer": {}, "registry": {"position": {"y": 0, "x": 0}, "isConnection": False, "isMeta": False}, "collection": {}, "children": []}):
        logger.info('Create object for "{0}" project, root: "{1}", parent rel_id: "{2}", data: "{3}".'.format(project, commit_hash, rel_id, json.dumps(data)))
        response = self.put_rest(project + '/' + commit_hash + rel_id, json.dumps(data))
        return response

    def update_node(self, project, commit_hash, rel_id='', data={"attribute": {"name": "new_node222"}}):
        logger.info('Update object for "{0}" project, root: "{1}", parent rel_id: "{2}", data: "{3}".'.format(project, commit_hash, rel_id, json.dumps(data)))

        node = self.get_object(project, commit_hash, rel_id)
        node.update(data)

        response = self.post_rest(project + '/' + commit_hash + rel_id, json.dumps(node))
        return response

    def set_node(self, project, commit_hash, rel_id='', data={"attribute": {"name": "new_node222"}}):
        logger.info('Set object for "{0}" project, root: "{1}", parent rel_id: "{2}", data: "{3}".'.format(project, commit_hash, rel_id, json.dumps(data)))
        response = self.post_rest(project + '/' + commit_hash + rel_id, json.dumps(data))
        return response

    def delete_node(self, project, commit_hash, rel_id=''):
        logger.info('Delete object for "{0}" project, root: "{1}", parent rel_id: "{2}".'.format(project, commit_hash, rel_id))
        response = self.delete_rest(project + '/' + commit_hash + rel_id)
        return response