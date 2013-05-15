echo "Re-compiling stylesheets..."

# --- variable and function definitions
DIR="nodeserver/src/config/"
SOURCEFILE="local.config"
DESTFILE="local.config.js"
CONFIGFILE=$DIR$DESTFILE

if test -e $CONFIGFILE; then
   echo "Config $CONFIGFILE exists, all good."
else
   echo "File $CONFIGFILE does not exist, creating it..."
   cp $DIR$SOURCEFILE $CONFIGFILE
   echo "DONE"
fi