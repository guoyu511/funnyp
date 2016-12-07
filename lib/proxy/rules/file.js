'use strict';

var ProxyRule = require('./rule'),
  fs = require('fs'),
  path = require('path'),
  mime = require('mime-types'),
  logger = require('log4js').getLogger('FileRule');

class FileRule extends ProxyRule {

  constructor(server, config) {
    super(server, config);
    this._location = config['location'];
  }

  response(req, res) {
    let location = super.replaceWithRegExp(req.url, this._location);
    if (!fs.existsSync(location)) {
      logger.warn('File not exists', location);
      res.writeHead(404);
      res.end('File Not Found');
      return;
    }
    logger.debug(`Location ${location}`);
    res.writeHead(200, {
      'Content-Type': mime.lookup(location) || 'application/octet-stream'
    });
    fs.createReadStream(location)
      .on('error', (e) => {
        logger.warn('File pipe error', location, e);
        res.writeHead(404);
        res.end('File Not Found');
        return;
      }).pipe(res);
    return true;
  }

  get name() {
    return 'FileHandler';
  }

}

module.exports = FileRule;