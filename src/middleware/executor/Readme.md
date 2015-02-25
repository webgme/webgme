## Executor API ##

### REST API ###

- `GET /rest/external/executor/?status=CREATED`
- `GET /rest/external/executor/info/[job sha1]` 
- `POST /rest/external/executor/create/[job sha1]`
- `POST /rest/external/executor/update/[job sha1]`

See also `ExecutorClient.js`. See `JobInfo.js` for the list of fields.

- `GET /rest/external/executor/worker/`  

### Usage of Executor Client ###

See [`executor_worker/README.txt`](../../../executor_worker/README.txt) and [`executor_worker/README.md`](../../../executor_worker/README.md)

### Labels ###

See [`executor_worker/README.txt`](../../../executor_worker/README.txt)

### Job storage ###

Jobs are stored in the WebGME blob. Job information is stored in the jobList.nedb file.
