## Binary Large Object storage ##

### Requirements ###

1. Content shall be tracked
* Same content shall be stored only once
* Same content may be stored with different file names
* Complex contents shall be stored, where complex means it has an internal structure and can reference multiple files. This is a tree or directory.
* Internal structure of the complex content can be retrieved
* Partial content (file/directory) can be retrieved from complex contents
* File name can be retrieved for a stored file by an ID
* File name can be retrieved for a stored complex content by an ID
* Size can be retrieved for a stored file by an ID
* Size can be retrieved for a stored complex content by an ID
* Storing the same file (file name + content) at different time shall have the same ID (time invariant)
* Storing the same complex file (file name + content) at different time shall have the same ID (time invariant)
* Created date can be retrieved
* Last modified date can be retrieved
* If the content is identical then it shall not be overwritten in the storage, but the content descriptor must be overridden to update last modified date
* Content and metadata IDs should be separated
* If we stop the storage service and restart it the existing storage should be functional
* If we connect the webgme server to a new storage it should just work as it is
* If we export a project put it to another deployment and copy/migrate the storage no links should be broken in the project and models.
* If we ran a plugin and generated an artifact with HASH1 based on the model. Then users updated some artifacts giving different file names only, no content change. They also changed the model structure (connections/new blocks/delete a few elements) in a way that it does not affect the plugin, since it is not generating artifacts from such elements then the generated hash __must__ be HASH1 assuming the name of the generated artifact has not changed.
* Getting all metadata descriptors should be paginated and an optional query string might be provided.
* Minimize the number of PUT/GET/POST requests to the server as much as we could. E.g. artifacts should contain mime-types and direct content hashes.
* Complex contents i.e. artifacts shall be downloaded as a whole in a form of a zip package. Framework shall support a few (1-10) GB of zip packages at least.
* Multiple storage backend can be used (one at a time) FileSystem, AWS S3, (OpenStack Swift)
* Data migration between storage backend should be provided.


### Design ###

#### Backend ####

##### Types #####

* FileSystem - `BlobFSBackend`
* AWS S3 - `BlobS3Backend`
* (OpenStack Swift)

##### Data organization (buckets) #####

* `wg-content` - webgme content bucket storage. All file content is stored in this bucket.
* `wg-metadata` - webgme content descriptors, i.e. metadata. Each metadata has one or more links to either to a content (hard link) or to another metadata (soft link) or multiple links to content (complex content).
* `wg-temp` - webgme temporary storage for content and metadata. All files gets stored first here, since we do not have the correct key name until we store the data. Once the key (content hash) is available we move (copy + delete) the temporary object. 


##### Metadata #####

* `name` - file name
* `size` - file size in Bytes
* `mime` - mime-type of the file/content
* `content` - HASH or object
* `contentType` - `object`, (`softlink`) or `complex`
* `lastModified` - last modified date and time in ISO 8601 format. 

> Note: `lastModified` value is not stored in the storage, but it is part of the response.

_File example_
```json
{
    "name": "sample.js",
    "size": 2093,
    "mime": "application/javascript",
    "content": "c2905bc187fbe55926e10bfd0baadad2f8493cbb",
    "contentType": "object",
    "lastModified": "2014-04-22T16:43:03.000Z"
}
```

_Complex content example_
```json
{
    "name": "sample.zip",
    "size": 17591,
    "mime": "application/zip, application/octet-stream",
    "content": {
        "a/b/sample.js": {
            "content": "c2905bc187fbe55926e10bfd0baadad2f8493cbb",
            "contentType": "object"
        },
        "sample.js": {
            "content": "c2905bc187fbe55926e10bfd0baadad2f8493cbb",
            "contentType": "object"
        },
        "sample.txt": {
            "content": "5fabecff1352dfcc0ad040d8ab883fba31fa1030",
            "contentType": "object"
        }
    },
    "contentType": "complex",
    "lastModified": "2014-04-22T16:43:03.000Z"
}
```


##### Functions #####

* putObject(readStream, bucket, callback)
* getObject(hash, writeStream, bucket, callback)
* listObjects(bucket, callback)

##### Common backend functionality #####

`BlobBackendBase` implements a set of common backend functionality independent from the actual storage type. The `abstract` functions are implemented by the derived classes `BlobFSBackend` and `BlobS3Backend`.

* `abstract` putObject(readStream, bucket, callback)
* `abstract` getObject(hash, writeStream, bucket, callback)
* `abstract` listObjects(bucket, callback)
* putFile(name, readStream, callback)
* getFile(metadataHash, writeStream, callback)
* putMetadata(metadata, callback)
* getMetadata(metadataHash, callback)
* listAllMetadata(callback)
* test(callback)


#### Service ####

TODO: GET/PUT/POST requests and return types etc.

#### Client libraries ####

##### Blob Client #####

`BlobClient` is a client side library that uses HTTP(S) protocol to access the storage through the webserver's authentication layer. 


##### Blob Server-side Client #####

`BlobServerClient` provides access to the storage for server-side scripts using HTTP(S) requests.

##### Blob run plugin Client #####

`BlobRunPluginClient` provides direct access to the storage for server-side scripts. __Note: this can only be used in development mode.__


#### Presentation layer ####

##### Assets #####

`AssetWidget` is a user control that helps users to access (upload/download) assets associated with the model or plugin source data and plugin results.

`AssetWidget` uses the client side `BlobClient` class to access to stored files/artifacts and their metadata.
