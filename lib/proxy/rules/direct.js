'use strict';

var ProxyRule = require('./rule'),
    url = require('url'),
    http = require('http');

class DirectRule extends ProxyRule {

    constructor(server) {
        super(server, {
            regexp : '.*'
        });
    }

    response(req, res) {

        let token = url.parse(req.url),
            options = {
                port : token.port || 80,
                hostname : token.hostname,
                method : req.method,
                path : token.path,
                headers : Object.assign({}, req.headers)
            },
            targetReq;
        req.hostname = token.hostname;
        targetReq = http.request(options, (targetRes) => {
            res.writeHead(targetRes.statusCode, targetRes.headers);
            targetRes.pipe(res);
        });
        targetReq.on('error', (e) => {
            if (res.finished) {
                return;
            }
            res.writeHead(502, {
                'Content-Type' : 'text/plain'
            });
            res.end('Bad Gateway');
        });
        req.pipe(targetReq);
    }

    get name() {
        return 'Direct';
    }

}

module.exports = DirectRule;