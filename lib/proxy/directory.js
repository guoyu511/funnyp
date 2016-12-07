'use strict';

var path = require('path'),
  fs = require('fs-extra'),
  home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
  funnyp = path.join(home, 'funnyp');

if (!fs.existsSync(funnyp)) {
  fs.mkdirSync(funnyp);
}

module.exports = funnyp;