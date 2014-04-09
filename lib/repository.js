/**
 * Copyright: E2E Technologies Ltd
 * Author: Cyril Schmitt <cschmitt@e2ebridge.com>
 */
"use strict";

var fs = require('fs');
var path = require('path');
var Packer = require("./fstream-e2e");
var archiver = require('archiver');

exports.pack = pack;

function pack(folder, output, cb){
    var stopped = true;
    var outputStream = fs.createWriteStream(path.resolve(output));
    var archive = archiver('zip');
    var cbCalled = false;
    var _cb = function(err){
        if(!cbCalled) {
            cb(err);
            cbCalled = true;
        }
    };

    archive.pipe(outputStream);

    outputStream.on('close', function(){
        _cb();
    });


    if(typeof cb !== 'function'){
        cb = function(){};
    }



    new Packer({path: folder, type: "Directory", isDirectory: true})
        .on("error", function(err){
            stopped = true;
            _cb(err);
        })
        .on("child", function (c) {
            var file = c.path.substr(c.root.path.length + 1); // relative filename

            if(!stopped && !c.props.Directory && c.path !== path.resolve(output)){
                archive.append(c, {name: file});
            }
        })
        .on("close", function(){
            archive.finalize();
        });

    stopped = false;
}