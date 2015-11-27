'use strict';

var ProxyRule = require('./rule'),
    fs = require('fs'),
    path = require('path'),
    logger = require('log4js').getLogger('ReverseProxy'),
    http = require('http'),
    url = require('url');

class ReverseRule extends ProxyRule {

    constructor(server, config) {
        super(server, config);
        this._upstream = config['upstream'];
    }

    response(req, res) {
        let upstream = super.replaceWithRegExp(req.url, this._upstream),
            token = url.parse(upstream),
            options = {
                protocol : token.protocol,
                port : token.port || 80,
                hostname : token.hostname,
                method : req.method,
                path : token.path,
                headers : Object.assign({
                    'X-Forwarded-For' : req.socket.remoteAddress
                }, req.headers)
            },
            targetReq;
        req.hostname = token.hostname;
        /*for (let name in options.headers) {
            if (name.indexOf('x-') === 0) {
                delete options.headers[name];
            }
        }*/
        targetReq = http.request(options, (targetRes) => {
            res.writeHead(targetRes.statusCode, targetRes.headers);
            targetRes.pipe(res);
        });
        targetReq.on('error', (e) => {
            logger.warn(e);
            if (res.finished) {
                return;
            }
            res.writeHead(502);
            res.end('Bad Gateway');
        });
        req.pipe(targetReq);
        logger.debug(`ProxyPass: ${upstream}`);
        return true;
    }

    get name() {
        return 'ReverseProxy';
    }

}

module.exports = ReverseRule;