FORMAT: 1A

# WebGME API
WebGME API provides access to various resources such as _users_, _organizations_, and _projects_.

All paths are relative to version 1 api `/api/v1` or the latest api `/api`.

Throughout this document we will use `http://localhost:8888/` as the base url. E.g. the api root is `http://localhost:8888/api`.

## Authentication
*WebGME API* uses Basic Authentication. __Note: in the future we will switch to OAuth tokens that could be acquired by Basic Authentication__

## Media Types
Where applicable this API uses JSON documents, responses have `X-WebGME-Media-Type` header.

Requests with a message-body are using JSON to create or update resources.

## Error States
The common [HTTP Response Status Codes](https://github.com/for-GET/know-your-http-well/blob/master/status-codes.md) are used.

# WebGME API Root [/]
WebGME API entry point.

## Retrieve the Entry Point [GET]

+ Response 200 (application/json)
    + Body

            {
                "current_user_url": "http://localhost:8888/api/user",
                "organization_url": "http://localhost:8888/api/orgs/{org}",
                "project_url": "http://localhost:8888/api/projects/{owner}/{project}",
                "user_url": "http://localhost:8888/api/users/{user}",
                "documentation_url": "http://localhost:8888/developer/api"
            }

# Group Users
User related resources of *WebGME API*.

User profile has the following attributes:

# User [/users/{username}]

+ id - user's login name
+ email - user's primary email address
+ canCreate - can create a new project

+ Parameters
    + username (required, string) - login name of the user

+ Model (application/json)

    + Body

            {
                "_id": "demo",
                "email": "a@example.com",
                "canCreate": true,
                "projects": { },
                "orgs": [ ],
                "siteAdmin": false
            }

### Retrieve [GET]

+ Response 200

    [User][]

### Update [PATCH]

+ Request (application/json)

        {
            "password": "demo",
            "email": "a@example.com",
            "canCreate": true,
            "siteAdmin": false
        }

+ Response 200

    [User][]

+ Response 401

        {
            "message": "Authentication required",
        }

+ Response 403

        {
            "message": "No sufficient role",
        }

## Users Collection [/users]
Collection of all Users.

+ Model (application/json)

    + Body

            [
                {
                    "_id": "asdf",
                    "email": "a@email.com",
                    "canCreate": true,
                    "projects": {
                        "aaaa": {
                            "read": true,
                            "write": true,
                            "delete": true
                        }
                    },
                    "orgs": [ ]
                },
                {
                    "_id": "user",
                    "email": "user@example.com",
                    "canCreate": null,
                    "projects": { },
                    "orgs": [ ]
                },
                {
                    "_id": "demo",
                    "email": "a@example.com",
                    "canCreate": false,
                    "projects": { },
                    "orgs": [ ],
                    "siteAdmin": false
                }
            ]

### List All Users [GET]

+ Response 200

    [Users Collection][]

### Create a User [PUT]

+ Request (application/json)

    + Body

            {
                "userId": "demo",
                "password": "demo",
                "email": "a@example.com",
                "canCreate": true,
                "siteAdmin": false
            }

+ Response 201

    [User][]

+ Response 401 (application/json)

        {
            "message": "Authentication required",
        }

+ Response 403 (application/json)

        {
            "message": "No sufficient role",
        }


### Update a User [PATCH]

+ Request (application/json)

        {
            "userId": "demo",
            "password": "demo",
            "email": "a@example.com",
            "canCreate": true,
            "siteAdmin": false
        }

+ Response 200

    [User][]

+ Response 401

        {
            "message": "Authentication required",
        }

+ Response 403

        {
            "message": "No sufficient role",
        }

## Current User [/user]
Currently authenticated user's information.

### Retrieve user [GET]

+ Response 200

    [User][]

+ Response 401

        {
            "message": "Authentication required",
        }

### Edit user information [PATCH]

+ Request (application/json)

        {
            "canCreate": false
        }

+ Response 200

        {
            "_id": "demo",
            "email": "a@example.com",
            "canCreate": false,
            "projects": { },
            "orgs": [ ],
            "siteAdmin": false
        }

+ Response 401

        {
            "message": "Authentication required",
        }

### Delete the user [DELETE]

+ Response 204

+ Response 401

        {
            "message": "Authentication required",
        }

# Group Organizations
Organization related resources of *WebGME API*.

__Will be available in 0.10+ release__


# Group Projects
Organization related resources of *WebGME API*.

# Projects collection [/projects]

## List all projects [GET]

+ Response 200

        [
            "username1/projectId1",
            "organization2/projectId2",
            "username23/projectId3"
        ]

# Project [/projects/{projectId}]

+ Parameters
    + projectId (required, string) - id of the project

## Get project information [GET]

+ Response 200

        // TODO: implement this

## Delete a project [DELETE]

+ Response 204

+ Response 401

        {
            "message": "Authentication required",
        }

+ Response 403

        {
            "message": "No sufficient role",
        }

## Project branches [/projects/{projectId}/branches]


### List branches [GET]

+ Response 200

        {
            "branch1": "#310511795314754105e2378960c5aee07514b76c",
            "branch22": "#e9a7862f631a7beea1254833832b7a5f57069f28",
            "dev": "#5e2e10ab277389a7d66419b85037f03b3a2028ef",
            "initial": "#5a94edc1854459df543183260b360baa9460f990",
            "master": "#26fdd622341bd70c79baf324ace9a3a3ef82e28d",
            "meta": "#e9a7862f631a7beea1254833832b7a5f57069f28",
            "meta_latest": "#94f9245ca4b128c164562a0a5e208366b77ba338",
            "meta_v1": "#94f9245ca4b128c164562a0a5e208366b77ba338"
        }


## Project commits [/projects/{projectId}/commits]


### List branches [GET]

Returns with the most recent 100 commits

+ Response 200

        [
            {
                "_id": "#310511795314754105e2378960c5aee07514b76c",
                "root": "#e1329f4b8793c136cbaf6f9b70526dd0fe73e2a2",
                "parents": [
                    "#2946b502c7807572ce153643126b8b1c0ea2e4a8"
                ],
                "updater": [
                    "anonymous"
                ],
                "time": 1429563737490,
                "message": "library update done",
                "type": "commit"
            }
        ]