## Executor API ##

### REST API ###

- `GET /rest/executor/?status=CREATED`
- `GET /rest/executor/info/[job sha1]` 
- `POST /rest/executor/create/[job sha1]`
- `POST /rest/executor/update/[job sha1]`

See also `ExecutorClient.js`. See `JobInfo.js` for the list of fields.

- `GET /rest/executor/worker/`  

### Usage of Executor Client ###

See [`worker/README.txt`](./worker/README.txt) and [`worker/README.md`](./worker/README.md)

For example of usage see `./src/plugin/coreplugins/ExecutorPlugin`

### Labels ###

See [`worker/README.txt`](./worker/README.txt)

### Job storage ###

Jobs are stored in the WebGME blob. Job information is stored in the `jobList.nedb` file.
