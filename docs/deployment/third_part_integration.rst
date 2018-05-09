Integrating a WebGME Design Studio with CPS-VO
==============================================

This documentation is intended for you who have developed a design studio with `WebGME <https://webgme.org>`_ and want to
 make it publicly accessible for users on https://cps-vo.org.

An integration between a WebGME design studio in and CPS-VO simply means that a link to the design studio is available
from a group on CPS-VO with the addition that the user's identity at cps-vo is forwarded to the WebGME server.
By disabling the option for users to register on your WebGME deployment, you can ensure that only people with user-accounts
on CPS-VO (and access to your particular group) are able to logon to your deployment.

In order for this to work properly this documentation will guide you through the necessary steps on how to host
such a WebGME deployment (most of these steps apply regardless of whether or not the deployment is integrated with CPS-VO.)

The steps are as follows:

1. Enabling authentication on your WebGME server
2. Allowing CPS-VO to authenticate users in WebGME.

In addition to these steps you need to setup a secure deployment. Notes on that can be found in the previous section.

Step 1: Enabling authentication on your WebGME Server
----------------------------------------------------
Before turning on authentication you must generate a set of  `RSA Keys <https://en.wikipedia.org/wiki/RSA_(cryptosystem)>`_.
These are used to encrypt (the private key) and decrypt (the public key) the tokens containing the users identity.
Sharing the private key with CPS-VO allows it to forward the users identity to WebGME. One way of doing this is to set
the token query when navigating to your WebGME site, e.g. ``https://mywebgme.org?token=<tokenString>``.

1.  Create a new directory, e.g. ``mkdir token_keys``, next to your checked out repository. (It's important that these keys are outside the cwd of the running WebGME server.)
2.  Using openssl (available for  `windows <http://gnuwin32.sourceforge.net/packages/openssl.htm>`_ a private key  is generated with:
    ``openssl genrsa -out token_keys/private_key 1024``
3. The public key is generated from the private key with:
    ``openssl rsa -in token_keys/private_key -pubout > token_keys/public_key``

With the keys ready the next step is to configure WebGME to enable authentication/authorization. Since you probably want
to have a different configuration for deploying the server then when you're developing your application it's advised to
create a new configuration that appends to your default configuration.

Create a new file in your repository at ``./config/config.deployment.js``,
`this section describes how to make sure it is being used <https://github.com/webgme/webgme/tree/master/config#which-configuration-file-is-being-used>`_.

Read through the section here and add the content to your new file.

.. code-block:: javascript

    // you can remove this line once you know this file is picked up
    console.log('### using webgme config from config.deployment.js ###');

    // require your default configuration
    var config = require('./config.default');

    // enable authentication
    config.authentication.enable = true;

    // by default non-authenticated users are authenticated as 'guest' this can be disabled
    config.authentication.allowGuests = false;

    // this allows users created via the cps-vo route to create new projects
    // which may or may not suite your deployment (but most likely you want this enabled)
    config.authentication.inferredUsersCanCreate = true;

    // disable user registration
    config.authentication.allowUserRegistration = false;

    // this assumes the keys are placed outside the webgme-app folder,
    // as mentioned in the key generation section ../../token_keys directory
    config.authentication.jwt.privateKey = __dirname + '/../../token_keys/private_key';
    config.authentication.jwt.publicKey = __dirname + '/../../token_keys/public_key';

    // finally make sure to export the augmented config
    module.exports = config;


The full list of all available configuration parameters regarding `authentication is available here <https://github.com/webgme/webgme/tree/master/config#authentication>`_.

It's always a good idea to have a site-admin account for your deployment which allows you to create, delete and manage
access level of users, etc. from the WebGME profile page interface.

Since WebGME version 2.25.0 you specify an admin account to be created (or ensured to exist) at server startup.
The following addition to the ``config.deployment.js`` above will create a user ``admin`` with password ``password``.

.. code-block:: javascript

    // The password defined here will be visible so make sure to change it once the server has
    // been run at least once.
    config.authentication.adminAccount = 'admin:password';


You should now be able to login to the profile page at ``<host>/profile/login``, once logged in make sure to change the password from the WebGME profile interface.

For more details about authentication and authorization in WebGME `these tutorials have a dedicated section <https://github.com/webgme/tutorials/tree/master/_session6_auth>`_.

Step 2: Linking the WebGME Server from CPS-VO
---------------------------------------------------------------
Share the private key with your contact at cps-vo.org and provide a url to your WebGME interface.
