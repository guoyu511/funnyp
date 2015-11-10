'use strict';

var ProxyRule = require('./rule'),
    fs = require('fs'),
    path = require('path'),
    logger = require('log4js').getLogger('FileRule');

class FileRule extends ProxyRule {

    constructor(server, config) {
        super(server, config);
        this._location = config['location'];
    }

    response(req, res) {
        let location = super.replaceWithRegExp(req.url, this._location);
        if (!fs.existsSync(location)) {
            res.writeHead(404);
            res.end();
            logger.warn('File not exists', location);
            return;
        }
        logger.debug(`Location ${location}`);
        fs.createReadStream(location).pipe(res);
        return true;
    }

    get name() {
        return 'FileHandler';
    }

}

module.exports = FileRule;