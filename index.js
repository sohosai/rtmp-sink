'use strict';

var Handshake = require('./handshake'),
    net = require('net');

net.createServer(function (conn) {
  var hs = new Handshake(conn);
  hs.handshake();
}).listen(1935);
