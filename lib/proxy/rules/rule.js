'use strict';

var logger = require('log4js').getLogger('ProxyRule');

class ProxyRule {

  constructor(server, config) {
    this._server = server;
    this._config = config;
    this._regexp = new RegExp(config['regexp']);
  }

  /**
   * process request and response if matched
   * @param req
   * @param res
   * @returns {boolean} if break all;
   */
  process(url, req, res, report) {
    if (!this._regexp.test(url.href)) {
      return false;
    }
    this.logger.debug([this.name, url.href].join(' - '));
    return this.response(url, req, res, report);
  }

  /**
   * Abstract
   * deal with response
   * @param server
   * @param req
   * @param res
   */
  response(server, req, res) {
    throw new Error('Not implemented.');
  }

  replaceWithRegExp(url, target) {
    return url.replace(this._regexp, target);
  }

  get server() {
    return this._server;
  }

  get name() {
    throw new Error('Not implemented.');
  }

  get logger() {
    return this._server.logger;
  }

}

module.exports = ProxyRule;