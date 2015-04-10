executor_worker README

The executor_worker runs jobs posted to src/rest/executor. For example, some plugins post jobs. Jobs are run by downloading a blob from the WebGME server, then running a command, then uploading some or all of the produced files to the blob store.

The executor_worker may run on a different machine than the WebGME server.


To run the GUI executor worker on Windows:

Download node-webkit (e.g. http://dl.nwjs.io/v0.9.2/node-webkit-v0.9.2-win-ia32.zip) and unzip into this directory.
  curl -f -o %userprofile%\Downloads\node-webkit-v0.9.2-win-ia32.zip -z %userprofile%\Downloads\node-webkit-v0.9.2-win-ia32.zip http://dl.nwjs.io/v0.9.2/node-webkit-v0.9.2-win-ia32.zip
  "c:\Program Files\7-Zip\7z.exe" x  %userprofile%\Downloads\node-webkit-v0.9.2-win-ia32.zip
Run:
  npm install
  copy config_example.json config.json
Edit config.json
With WebGME started, run nw.exe

To run cls executor worker:
node node_worker.js

Authorization:
To ensure only authorized workers are adding and running jobs, configure the pre-shared secret between the WebGME server and the workers.
1. Add "executorNonce": "reallylongsecret" to config.json
2. Change executor_worker\config.json like: { "http://localhost:8888": { "executorNonce": "reallylongsecret" } }

Implementation TODO:
Recover from transient errors
Handle disconnecting/reconnecting of workers more gracefully
Expose REST API for workers

https:
Put CA .crt or .pem files in this directory to add non-trusted CAs.

Labels:
Jobs with labels specified require an executor_worker that has all of the jobs' labels. executor_workers get labels automatically, by running jobs that determine if a tool is on that machine.
HOWTO: add label job
1. Create the job itself:
  Write a cmd.exe script "run_execution.cmd" that exits with code 0 if the tool exists, is licensed, etc
  echo { "cmd": "run_execution.cmd", "resultArtifacts": [ ] } > executor_config.json
  "C:\Program Files\7-Zip\7z.exe" a META_14.08.zip run_execution.cmd executor_config.json
2. Add an entry to labelJobs.json
  Method 1: manual:
    curl --header "Content-Type:application/octet-stream" --data-binary @META_14.08.zip http://localhost:8855/rest/blob/createFile/META_14.08.zip
    add entry "META_14.09": "b350eb95d1cdf7424af72253902081107403f76b" to labelJobs.json
  Method 2: addLabelJob.js script:
    put all label job .zip files into a directory
    node addLabelJob.js http://localhost:8855/ *zip > labelJobs.json
    move /y labelJobs.json ..\labelJobs.json
 labelJobs.json should go where WebGME's working directory is, i.e. where `node app.js` is running. It will be loaded and re-loaded automatically