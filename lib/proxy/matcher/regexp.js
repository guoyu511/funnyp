'use strict';

class RegExpMatcher {

    constructor(config) {
        this._exp = new RegExp(config.exp,
            config['i'] ? 'i' : '');
    }

    test(req) {
        let url = req.url;
        return this._exp.test(url);
    }

    toString() {
        return this._exp.toString();
    }

    static get name() {
        return 'Regexp';
    }

}

module.exports = RegExpMatcher;