'use strict';

var ProxyRule = require('./rule'),
    fs = require('fs'),
    path = require('path'),
    logger = require('log4js').getLogger('ReverseProxy'),
    http = require('http'),
    url = require('url');

class RedirectRule extends ProxyRule {

    constructor(server, config) {
        super(server, config);
        this._upstream = config['upstream'];
    }

    response(req, res) {
        let upstream = super.replaceWithRegExp(req.url, this._upstream),
            token = url.parse(upstream),
            targetReq = http.request({
                protocol : token.protocol,
                port : token.port || 80,
                hostname : token.hostname,
                method : req.method,
                path : token.path + (token.search || ''),
                headers : Object.assign({}, req.headers, {
                    host : token.hostname
                })
            }, (targetRes) => {
                res.writeHead(targetRes.statusCode, targetRes.headers);
                targetRes.pipe(res);
            });
        targetReq.on('error', (e) => {
            logger.warn(e);
            res.writeHead(502);
            res.end();
        });
        req.pipe(targetReq);
        logger.debug(`ProxyPass: ${upstream}`);
        return true;
    }

    get name() {
        return 'ReverseProxy';
    }

}

module.exports = RedirectRule;