dmaster
=======

A web-based Doom server browser and REST API.

This software stack powers [DoomSpy](doomspy.com) and I hope it can be useful
to you as well.

Installation
------------

You need a working and relatively recent version of
[Node.js](http://nodejs.org/).  Your node installation must be capable of
compiling native addons via node-gyp, so please make sure you have Python 2.x
and either a GCC-compatible C++ compiler on Unix-alikes or Visual C++ 2010/2012
on Windows.

Once you have these things installed, installation should be fairly painless.

    $ git clone <url> dmaster
    $ cd dmaster
    $ npm install

Starting the server
-------------------

    $ node dmaster

Configuration
-------------

All default configuration options are located in `config/default.json`.  To
override any of the defaults, create `config/runtime.json` and re-define any
configuration entries that you wish.

### dmaster.udpPort

The port that you wish to use to send out master server and server info
queries.

### dmaster.webPort

The port that you wish to enable the HTTP front-end server for.  Both the
website and REST API will share the same port.

### masters[].type

The type of master server that requests will be going out to.  Valid types are:

- `zandronum`

...and that's it, really.  More coming soon...

### masters[].address
### masters[].port

The address and port of the master server to query.

### masters[].timeout

The number of seconds to wait between master server queries.  It's not polite
to set this number too low, and some master servers might throttle or even
block your connection completely.

License
-------

dmaster is released under the GNU Affero General Public License Version 3.  The
full text of the license is included with dmaster.

I am open to alternative licensing arrangements for all or part of the
codebase.  Simply drop me a line and we can chat.
