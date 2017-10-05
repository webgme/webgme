Dependencies
===============
One of the advantages of being a web-based modeling environment is that end-user do not need be concerned with
installing any dependencies on their machine. All they need is a web browser! We aim to support all the major modern browsers.
However we recommend using Chrome for a couple of reasons:
1. Manual testing is mostly done using chrome
2. Performance profiling is done against the `V8 JavaScript Engine <https://en.wikipedia.org/wiki/V8_(JavaScript_engine)>`

As a developer of a webgme app you will however be required to host your own webgme server and for that you will need
to install some dependencies in addition to having access to a browser.

* `NodeJS <https://nodejs.org/>` (version >= 4, CI tests are performed on versions 4.x, 6.x and LTS is recommended).
* `MongoDB <https://www.mongodb.com/>` (version >= 2.6).
* `Git <https://git-scm.com>` (must be available in PATH).
* (Optional) `Redis <https://redis.io/>` Note that this is only needed if you intend on running `multiple webgme nodes <https://github.com/webgme/webgme/wiki/Multiple-Nodes>`.