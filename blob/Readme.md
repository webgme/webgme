
## Binary Large Object storage ##

### Requirements ###

* content shall be tracked
* same content shall be stored only once
* same content may be stored with different file names
* complex contents shall be stored
* partial content can be retrieved from complex contents
* filename can be retrieved for a stored file
* filename can be retrieved for a stored complex content
* size can be retrieved for a stored file
* size can be retrieved for a stored complex content
* internal structure of the complex content can be retrieved
* storing the same file (filename + content) at different time shall have the same ID (time invariant)
* storing the same complex file (filename + content) at different time shall have the same ID (time invariant)
* Created date can be retrieved
* Last modified date can be retrieved
* If the content is identical then it shall not be overwritten in the storage, but the content descriptor must be overridden to update last modified date
content and metadata ids should be separated
* if we stop the web server and restart it the existing storage should be functional
* if we connect the web server to a new storage it should just work as it is
* if we export a project put it to another deployment and copy/migrate the storage no links should be broken in the project.
* if we ran a plugin and generated an artifact with HASH_A based on the model. Then users updated some artifacts giving different names only, no content change. They also changed the model structure (connections/new blocks/delete a few elements) in a way that it does not affect the plugin, since it is not generating artifacts from such elements then the generated hash must be HASH_A assuming the name of the generated artifact has not changed.
* Getting all metadata descriptors should be paginated and optional query string might be provided.
* Minimize the number of PUT/GET/POST requests. E.g. artifacts should contain mime-types and direct content hashes.
* Artifacts shall be downloaded as a whole in a form of a zip package. Framework shall support a few (1-10) GB of zip packages.
* Multiple storage backend can be used (one at a time) FileSystem, AWS S3, (OpenStack Swift)

### Design ###
