/**
 * Copyright: E2E Technologies Ltd
 * Author: Cyril Schmitt <cschmitt@e2ebridge.com>
 */
"use strict";

var Ignore = require("fstream-ignore");
var inherits = require("inherits");
var path = require("path");
var fs = require("fs");

module.exports = Packer;

inherits(Packer, Ignore);

function Packer (props) {
    if (!(this instanceof Packer)) {
        return new Packer(props)
    }

    if (typeof props === "string") {
        props = { path: props }
    }

    props.ignoreFiles = props.ignoreFiles || [ ".e2eignore" ];

    Ignore.call(this, props);
}


Packer.prototype.applyIgnores = function (entry, partial, entryObj) {
    // package.json files can never be ignored.
    if (entry === "package.json") return true;

    // some files are *never* allowed under any circumstances
    if (entry === ".git" ||
        entry === ".lock-wscript" ||
        entry.match(/^\.wafpickle-[0-9]+$/) ||
        entry === "CVS" ||
        entry === ".svn" ||
        entry === ".hg" ||
        entry.match(/^\..*\.swp$/) ||
        entry === ".DS_Store" ||
        entry.match(/^\._/) ||
        entry === "npm-debug.log"
        ) {
        return false
    }

    return Ignore.prototype.applyIgnores.call(this, entry, partial, entryObj)
};

