#!/bin/bash

echo "BROWSER = $TEST_BROWSER"
echo "TEST_FOLDER = $TEST_FOLDER"
echo "RECURSIVE = $RECURSIVE"

if [ "$TEST_BROWSER" == "true" ]
then
  export COMMAND="node ./node_modules/karma/bin/karma start karma.conf.js --browsers Firefox --single-run"
else
  export COMMAND="node ./node_modules/mocha/bin/mocha -R dot --timeout 10000"
  if [ "$RECURSIVE" == "true" ]
  then
    export COMMAND="$COMMAND --recursive $TEST_FOLDER"
  else
    export COMMAND="$COMMAND $TEST_FOLDER"
  fi
fi

echo "Running $COMMAND ..."

$COMMAND
