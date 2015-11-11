'use strict';

var ProxyRule = require('./rule'),
    url = require('url');

class DirectRule extends ProxyRule {

    constructor(server) {
        super(server, {
            regexp : '.*'
        });
    }

    response(req, res) {
        var token = url.parse(req.url);
        this.server._proxy.web(req, res, {
            target : {
                host : token.hostname,
                port : token.port || 80
            }
        });
    }

    get name() {
        return 'Direct';
    }

}

module.exports = DirectRule;