#! /usr/bin/env node

'use strict';

var opt = require('node-getopt').create([
        ['p', '=', 'Web UI bind port']
    ]).bindHelp().parseSystem();

require('./lib/startup')(opt['options']['p']);