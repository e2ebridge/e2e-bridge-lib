/**
 * Copyright: E2E Technologies Ltd
 * Author: Cyril Schmitt <cschmitt@e2ebridge.com>
 */
"use strict";

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    easyChild = require('easy-child'),
    archiver = require('archiver'),
    unzip = require('unzipper'),
    temp = require('temp').track(),
    Filter = require('./filter.js');

exports.pack = pack;

function pack(folder, output, options, callback) {
    var tasks = [];
    if(!callback) {
        callback = function () {};
    }
    if(options.git === true) {
        tasks.push(function(callback) {
            temp.open({suffix: '.zip'}, function(err, info) {
                callback(err, info.path);
            })
        });
        tasks.push(function(tmpOutput, callback) {
            easyChild.spawn(
                'git',
                ['archive', '-o', tmpOutput, 'HEAD'],
                {silent: true, cwd: folder},
                function(err) {
                    callback(err, tmpOutput);
                });
        });
        tasks.push(function(tmpOutput, callback) {
            gitArchive(folder, output, tmpOutput, callback);
        });
    } else {
        tasks.push(function(callback) {
            archive(folder, output, callback);
        });
    }
    async.waterfall(tasks, callback);
}

function gitArchive(folder, output, tmpZip, callback) {
    var cbCalled = false,
        _callback = function(err) {
            if(!cbCalled) {
                callback(err);
                cbCalled = true;
            }
        };
    const zip = archiver('zip');
    zip.pipe(fs.createWriteStream(output)
        .on('finish', _callback)
        .on('error', _callback));
    fs.createReadStream(tmpZip)
        .pipe(unzip.Parse())
        .on('entry', function(entry) {
            if(entry.type === 'File') {
                zip.append(entry, {name: entry.path});
            }
        })
        .on('close', function() {
            zip.glob(path.join(folder, 'node_modules/**'));
            try {
                fs.accessSync(path.join(folder, 'package-lock.json'), fs.R_OK)
                zip.append(path.join(folder, 'package-lock.json'), {name: 'package-lock.json'});
            } catch(e) {}
            zip.finalize();
        })
        .on('error', _callback);
}

function archive(folder, output, callback) {
    var stopped = true,
        filter = new Filter({path: folder}),
        cbCalled = false,
        _callback = function(err) {
            if(!cbCalled) {
                callback(err);
                cbCalled = true;
            }
        };
    const zip = archiver('zip');
    zip.pipe(fs.createWriteStream(path.resolve(output))
        .on('finish', _callback)
        .on('error', _callback));
    filter
        .on('error', function(error) {
            stopped = true;
            _callback(error);
        })
        .on('child', function(child) {
            var file;
            if(!stopped && !child.props.Directory && child.path !== path.resolve(output)) {
                file = child.path.substr(child.root.path.length + 1);
                zip.append(child, {name: file});
            }
        })
        .on('close', function() {
            zip.finalize();
        });
    stopped = false;
}
