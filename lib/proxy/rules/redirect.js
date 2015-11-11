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

    response(req, res) {
        let location = super.replaceWithRegExp(req.url, this._location);
        logger.debug(`Location: ${location}`);
        res.writeHead(302, {
            'Location' : location
        });
        res.end();
        return true;
    }

    get name() {
        return 'Redirect';
    }

}

module.exports = RedirectRule;