'use strict';

var ProxyRule = require('./rule');

class DirectRule extends ProxyRule {

    constructor(server) {
        super(server, {
            regexp : '.*'
        });
    }

    response(req, res) {
        this.server._proxy.web(req, res, {
            target : {
                host : req.headers.host,
                port : req.headers.port || 80
            }
        });
    }

    get name() {
        return 'Direct';
    }

}

module.exports = DirectRule;