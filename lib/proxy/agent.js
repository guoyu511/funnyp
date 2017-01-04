'use strict';

const http = require('http'),
  https = require('https'),
  httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 500
  }),
  httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 500
  });


module.exports = {
  http() {
    return httpAgent;
  },
  https() {
    return httpsAgent;
  }
};