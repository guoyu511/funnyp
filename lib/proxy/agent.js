'use strict';

const http = require('http'),
  https = require('https'),
  httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 60 * 1000
  }),
  httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 60 * 1000
  });


module.exports = {
  http() {
    return httpAgent;
  },
  https() {
    return httpsAgent;
  }
};