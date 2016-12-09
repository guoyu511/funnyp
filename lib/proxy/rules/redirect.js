'use strict';

var ProxyRule = require('./rule'),
  fs = require('fs'),
  path = require('path'),
  logger = require('log4js').getLogger('RedirectRule');

class RedirectRule extends ProxyRule {

  constructor(server, config) {
    super(server, config);
    this._location = config['location'];
  }

  response(url, req, res, reporter) {
    let location = super.replaceWithRegExp(url, this._location);
    logger.debug(`Location: ${location}`);
    res.writeHead(302, {
      'Location': location
    });
    reporter.logStatus(302, '');
    reporter.logResponseHeaders({
      'Location': location
    });
    res.end();
    reporter.logFinish();
    return true;
  }

  get name() {
    return 'Redirect';
  }

}

module.exports = RedirectRule;