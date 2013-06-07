@ECHO OFF
REM running combined http and webgme server
CALL node combined_server.js 1>> stdout.log 2>> stderr.log