SSL/TLS
================
The WebGME server itself does not provide a secure connection. Instead we recommend using a reverse-proxy
in front of the WebGME server that encrypts the data. `Nginx <https://www.nginx.com/>`_ is a commonly used one and an
example configuration for a webgme-app can be viewed here
`here <https://github.com/webgme/webgme.org/blob/master/aws/nginx.conf>`_.

To obtain a certificate you can either create a self signed one using `OpenSSL <https://www.ibm.com/support/knowledgecenter/en/SSWHYP_4.0.0/com.ibm.apimgmt.cmc.doc/task_apionprem_gernerate_self_signed_openSSL.html>`_.
If you have domain name `Let's Encrypt <https://letsencrypt.org/>`_ offers free certificates.
