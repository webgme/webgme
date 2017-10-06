SSL/TLS
================
The webgme server itself does not provide a secure connection. Instead we recommend using a reverse-proxy
in front of the webgme server that encrypts the data. Examples: nginx, haproxy
This is needed. Certificates can be found using free tools like letsencrypt.
