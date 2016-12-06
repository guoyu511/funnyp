'use strict';

var http = require('http');

module.exports = new http.Agent({
  keepAlive : true,
  keepAliveMsecs : 60 * 1000
});