'use strict';

var assert = require('assert'),
    events = require('events');

function genRandomBytes (size) {
  var randomBytes = new Buffer(size);
  for (var i = 0; i < randomBytes.length; i++) {
    randomBytes[i] = Math.floor(Math.random() * 256);
  }
  return randomBytes;
}

const HS_PACKET_SIZE = 1536;

const UNINITIALIZED  = 1,
      VERSION_SENT   = 2,
      ACK_SENT       = 4,
      HANDSHAKE_DONE = 8;

class Handshake {
  constructor(conn) {
    this.conn = conn;
    this.conn.setNoDelay(true);
  }

  handshake() {
    this.recvC0().then(()=> {
      return this.recvC1();
    }).then(c1 => {
      this.sendS0S1S2(c1);
      return this.recvC2();
    }).catch(err => {
      console.error(err);
    }).then(() => {
      return this.conn;
    });
  }

  recvBytes (size) {
    var stream = this.conn;
    return new Promise((resolve, reject) => {
      function onreadable () {
        var buf = stream.read(size);
        if (buf !== null) {
          dispose();
          resolve(buf);
        }
      }
      function onerror (err) {
        dispose();
        reject(err);
      }
      function dispose () {
        stream.removeListener('readable', onreadable);
        stream.removeListener('error', onerror);
      }
      stream.on('error', onerror);
      stream.on('readable', onreadable);
      onreadable();
    });
  }

  recvC0() {
    return this.recvBytes(1).then(bytes => {
      assert(bytes[0] === 0x03);
    });
  }

  recvC1() {
    return this.recvBytes(HS_PACKET_SIZE);
  }

  recvC2() {
    return this.recvBytes(HS_PACKET_SIZE);
  }

  sendBytes(bytes) {
    this.conn.write(bytes);
  }

  sendS0S1S2(c1) {
    this.sendBytes(this.genS0S1S2(c1));
  }

  genS0S1S2 (c1) {
    var version = new Buffer([0x03]);

    var timestamp = new Buffer([0, 0, 0, 0]),
        zero = new Buffer([0, 0, 0, 0]),
        randomBytes = genRandomBytes(1528);

    var c1Timestamp = c1.slice(0, 4),
        c1RandomBytes = c1.slice(8);

    return Buffer.concat([
      version,

      timestamp,
      zero,
      randomBytes,

      c1Timestamp,
      timestamp,
      c1RandomBytes
    ]);
  }
}

module.exports = Handshake;
