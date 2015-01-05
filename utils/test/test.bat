node_modules/jscoverage/bin/jscoverage src --exclude py,pem,log,svg,css,scss,html,.gitignore,otf,eot,ttf,woff,png,ico,gif,md,json,_js,.min.,txt,LICENSE,.map,.DS
node_modules/mocha/bin/mocha -R min
node_modules/mocha/bin/mocha -R html-cov > coverage.html
node utils/test/clean-coverage.js
