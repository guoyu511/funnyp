/**
 * Created by guoyu on 15/11/8.
 */
'use strict';

var ProxyServer = require('./proxy'),
  WebServer = require('./web'),
  webConsole = require('./web/console'),
  log4js = require('log4js'),
  layouts = require('log4js/lib/layouts'),
  logger = log4js.getLogger('Startup');

//log4js.replaceConsole();

log4js.addAppender((e) => {
  let info = layouts.basicLayout(e);
  webConsole.append(info);
});

module.exports = function (port) {

  ProxyServer.load();

  WebServer(port);

  process.on('uncaughtException', function (err) {
    logger.error(err.stack);
  });

};