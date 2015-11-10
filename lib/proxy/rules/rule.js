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
    process(req, res) {
        if (!this._regexp.test(req.url)) {
            return false;
        }
        logger.debug([req.url, this.name].join(' > '));
        return this.response(req, res);
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

}

module.exports = ProxyRule;