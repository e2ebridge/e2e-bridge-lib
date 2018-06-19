/**
 * Copyright: E2E Technologies Ltd
 */
'use strict';

var inherits = require('inherits');
var path = require('path');
var fs = require('fs');
var Ignore = require('fstream-ignore');

module.exports = Filter;

inherits(Filter, Ignore);

function Filter(props) {
    if(!(this instanceof Filter)) {
        return new Filter(props);
    }

    if(typeof props === 'string') {
        props = {path: path.resolve(props)};
    }

    if(!props.ignoreFiles) {
        props.ignoreFiles = ['.e2eignore'];
    }

    Ignore.call(this, props);
}

Filter.prototype.applyIgnores = function(entry, partial, obj) {
    // package.json files can never be ignored.
    if(entry === 'package.json') {
        return true;
    }

    // some files are *never* allowed under any circumstances
    if(entry === '.git'
        || entry === '.idea'
        || entry === '.lock-wscript'
        || entry.match(/^\.wafpickle-[0-9]+$/)
        || entry === 'CVS'
        || entry === '.svn'
        || entry === '.hg'
        || entry.match(/^\..*\.swp$/)
        || entry === '.DS_Store'
        || entry.match(/^\._/)
        || entry === 'npm-debug.log') {
        return false;
    }

    return Ignore.prototype.applyIgnores.call(this, entry, partial, obj);
};
