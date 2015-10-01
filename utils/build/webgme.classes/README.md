# Building guidelines

## webgme.classes.build   

   * !!! webgme.classes.build.js is currently not generated automatically so please whenever you make update to the webgme project, recreate it !!!
   * The makefile to build webgme.classes.build.js is build\build_classes.js. To build you have to use the requirejs's optimizer.
```
    //example executing from build directory - works on 
    node ./utils/build/webgme.classes/build_classes.js
```
   * Please note that in some cases you may also update the build_classes.js (with the new paths for example).
   * To provide a new class through this module you have to update webgme.classes.js module

 