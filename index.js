/**
 * Copyright: E2E Technologies Ltd
 * @author: Jakub Zakrzewski <jzakrzewski@e2e.ch>
 */

/*global define require */
"use strict";

var request = require('request');
var util = require('util');
var xml2js = require('xml2js-expat');
var fs = require('fs');
var path = require('path');

var repository = require('./lib/repository');

//fixme: When CON-879 is done
/** @const */ var ERROR_UNAUTHENTICATED = "The user is not authenticated";
/** @const */ var BRIDGE_BASE = '/admin/Console';
/** @const */ var FIRMWARE_DEPLOY_ENDPOINT = '/Deploy';
/** @const */ var LOGIN_ENDPOINT = '/Welcome';
/** @const */ var XUML_SERVICE_TYPE = 'xUML';
/** @const */ var NODE_SERVICE_TYPE = 'node';
/** @const */ var XUML_SERVICE_STATUS_ENDPOINT = '/BridgeInstanceConfiguration';
/** @const */ var NODE_SERVICE_STATUS_ENDPOINT = '/nodejs/service/Configuration';
/** @const */ var XUML_SERVICE_REMOVE_ENDPOINT = '/BridgeInstanceDelete';
/** @const */ var NODE_SERVICE_REMOVE_ENDPOINT = '/nodejs/service/Delete';
/** @const */ var REPOSITORY_CONTENT_TYPE = 'application/octet-stream';


function _defaultCallback(err) {
    if(err) {
        console.log(err);
    }
}

/**
 * Executes the request.
 *
 * At this point most of the request is already composed. The only tricky thing is form. E2E Bridge is very
 * sensitive on those forms, encoding and transfer. Therefore we have to use two different ways of attaching form
 * to request as they result in two different way of encoding and transferring the form.
 *
 * @param paramObject Prepared object for the request library.
 * @param form Form object.
 * @param {function(?Object=)} callback Param will be null if everything goes smoothly
 * @private
 */
function _executeRequest( paramObject, form, callback){

    if(!form.$isUpload) {
        paramObject.form = form;
    }

    var requestObject = request.post( paramObject,
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var parser = new xml2js.Parser(function(result, err) {
                    if (!err) {
                        if(result.Status === 'OK'){
                            callback();
                        } else {
                            callback({ errorType: "Bridge error", error: result});
                        }
                    }
                    else {
                        callback({ errorType: "SAX error", error: err});
                    }
                });
                parser.parseBuffer(body, true);
            } else {
                callback({ errorType: "HTTP error", error: { details: error, response: response}});
            }
        });

    if(form.$isUpload){
        var requestForm = requestObject.form();

        Object.keys(form).forEach(function(key){
            if(key.substr(0,1) === '$'){
                return;
            }

            if( form[key].fieldOptions ){
                requestForm.append(key, form[key].value, form[key].fieldOptions);
            } else {
                requestForm.append(key, form[key]);
            }
        })
    }
}

/**
 * Bridge object
 * @param {string} host
 * @param {integer} port
 * @param {?string} user
 * @param {?string} password
 * @constructor
 */
function Bridge(host, port, user, password) {
    this._host = host || 'localhost';
    this._port = port || 8080;
    this._user = user;
    this._password = password;
    this._coockieJar = request.jar();
    this._loggedIn = false;
}

/**
 * Log in to the bridge instance.
 * Can be used to establish login session. Must be used before other operations if
 * no user/password given to the constructor.
 *
 * @param {string} user
 * @param {string} password
 * @param {function(Object)} callback Called after login. Parameter will be null if login is successful
 */
Bridge.prototype.login = function( user, password, callback) {
    var self = this;

    if( typeof user === 'function') {
        callback = user;
        user = null;
    } else if( typeof password === 'function') {
        callback = password;
        password = null;
    }

    if(user) {
        self._user = user;
    }
    if(password) {
        self._password = password;
    }

    self._ensureLogin(callback);

}

/**
 * Prepare settings for request module.
 * @param {!string} endpoint Bridge endpoint, we intend to call
 * @param {?Object} getParams URI GET parameters to attach to endpoint (key-value pairs)
 * @returns {Object}
 * @private
 */
Bridge.prototype._composeRequestObject = function(endpoint, getParams) {

    var self = this;

    var getString = '';
    if(getParams){
        Object.keys(getParams).forEach(function(name){
            getString += encodeURIComponent(name) + '=' + encodeURIComponent(getParams[name]) + '&';
        });
    }

    var uri = 'https://' + self._host + ':' + self._port + BRIDGE_BASE + endpoint;
    if( getString != '') {
        uri += '?' + getString;
    }

    var ret = {
        "url": uri,
        "headers": {
            "X-Bridge": "return-xml"
        },
        "strictSSL": false, //because bridge uses self-signed certificate
        "jar": self._coockieJar,
        "followAllRedirects": true
    }

    return ret;
}

/**
 * Calls the callback after checking if login session is active.
 * If session is inactive, try to establish one.
 * @param {function(?Object=)} callback Param will be null if everything goes smoothly
 * @private
 */
Bridge.prototype._ensureLogin = function(callback) {

    var self = this;

    if( self._loggedIn){
        return callback();
    }

    _executeRequest(self._composeRequestObject( LOGIN_ENDPOINT), {
            "j_username": self._user,
            "j_password": self._password,
            "action_SUBMIT": "Login"
        }, callback);
}

/**
 * Be sure, that operation will be called only with active login session.
 * Because it is possible for login session to expire and we may not know this,
 * if we get authentication error with first trial, we will force re-login
 * and try again.
 *
 * @param {function(?Object=)} operation Whatever should be called on login session.
 * @param {function(?Object=)} callback What to call when done. This is separated from operation,
 * because we may be forced to call it ourselves.
 * @private
 */
Bridge.prototype._logInAndPerform = function( operation, callback){
    var self = this;

    self._ensureLogin(function(err){
        if(err){
            return callback(err);
        }

        operation( function(error){
            if(error && error.errorType === 'Bridge error' && error.error.Message === ERROR_UNAUTHENTICATED) {
                // this may happen after long period of inactivity. We have to re-login
                self._loggedIn = false;
                self._ensureLogin(function(er){
                    if(er){
                        return callback(er);
                    }

                    operation( function(e){
                        if(e){
                            return callback(e);
                        };

                        return callback();
                    });
                });
            } else if(error) {
                return callback(error);
            } else {
                return callback();
            }
        });
    });
}

/**
 * Change service status.
 * Also start, stop or kill a service. Either node or xUML.
 *
 * @param {!string} change 'start', 'stop' or 'kill'. Note, that 'kill' will not work for node.js services
 * @param {!string} serviceType 'xUML' or 'node'
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 * @private
 */
Bridge.prototype._setServiceStatus = function( change, serviceType, name, node, callback) {

    var self = this;

    if(typeof node === 'function') {
        callback = node;
        node = self._host;
    }
    if(!callback) {
        callback = _defaultCallback;
    }

    var form = null;
    if(change === 'start'){
        form = { "action_START": "Start" };
    } else if(change === 'stop'){
        form = { "action_STOP": "Stop" };
    } else if(change === 'kill'){
        form = { "action_KILL": "Kill" };
    }

    var endpoint = '';
    if(serviceType === XUML_SERVICE_TYPE) {
        endpoint = XUML_SERVICE_STATUS_ENDPOINT;
    } else if(serviceType === NODE_SERVICE_TYPE) {
        endpoint = NODE_SERVICE_STATUS_ENDPOINT;
    } else {
        // this is programming error, bail out immediately
        throw new TypeError('"serviceType" is expected to be "node" or "xUML". Got "' + serviceType + '"');
    }

    _executeRequest(self._composeRequestObject( endpoint, { "node": node, "instance": name}), form, callback);
}

/**
 * Start, stop or kill services.
 * @param {!string} status 'start', 'stop' or 'kill'. Note, that 'kill' will not work for node.js services
 * @param {!string} name Name of the service.
 * @param {!string} type 'xUML' or 'node'
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.setServiceStatus = function(status, name, type, node, callback){
    var self = this;

    if(status !== 'start' && status !== 'stop' && status !== 'kill'){
        // this is programming error, bail out immediately
        throw new TypeError('"status" is expected to be "start", "stop" or "kill". Got "' + status + '"');
    }

    self._logInAndPerform(function(innerCallback) {
        self._setServiceStatus(status, type, name, node, innerCallback);
    }, callback);
}

/**
 * Remove service from bridge
 * @param {!string} serviceType 'xUML' or 'node'
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 * @private
 */
Bridge.prototype._removeService = function(serviceType, name, node, callback) {

    var self = this;

    if(typeof node === 'function') {
        callback = node;
        node = self._host;
    }
    if(!callback) {
        callback = _defaultCallback;
    }

    var form = null;

    var endpoint = '';
    if(serviceType === XUML_SERVICE_TYPE) {
        endpoint = XUML_SERVICE_REMOVE_ENDPOINT;
        form = { "action_DELETE": "Delete xUML Service"};
    } else if(serviceType === NODE_SERVICE_TYPE) {
        endpoint = NODE_SERVICE_REMOVE_ENDPOINT;
        form = { "action_DELETE": "Delete Node.js Service"};
    } else {
        // this is programming error, bail out immediately
        throw new TypeError('"serviceType" is expected to be "node" or "xUML". Got "' + serviceType + '"');
    }

    _executeRequest(self._composeRequestObject( endpoint, { "node": node, "instance": name}), form, callback);
}

/**
 * Remove service from bridge
 * @param {!string} name Name of the service.
 * @param {!string} type 'xUML' or 'node'
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.removeService = function(name, type, node, callback){
    var self = this;

    self._logInAndPerform(function(innerCallback) {
        self._removeService(type, name, node, innerCallback);
    }, callback);
}

/**
 * Starts xUML service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.startXUMLService = function( name, node, callback) {
    this.setServiceStatus("start", name, XUML_SERVICE_TYPE, node, callback);
}

/**
 * Stops xUML service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.stopXUMLService = function( name, node, callback) {
    this.setServiceStatus("stop", name, XUML_SERVICE_TYPE, node, callback);
}

/**
 * Kills xUML service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.killXUMLService = function( name, node, callback) {
    this.setServiceStatus("kill", name, XUML_SERVICE_TYPE, node, callback);
}

/**
 * Removes xUML service from given node
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.removeXUMLService = function( name, node, callback) {
    this.removeService(name, XUML_SERVICE_TYPE, node, callback);
}

/**
 * Starts Node.js service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.startNodeService = function( name, node, callback) {
    this.setServiceStatus("start", name, NODE_SERVICE_TYPE, node, callback);
}

/**
 * Stops Node.js service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.stopNodeService = function( name, node, callback) {
    this.setServiceStatus("stop", name, NODE_SERVICE_TYPE, node, callback);
}

/**
 * Removes Node.js service from given node
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the bridge node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.removeNodeService = function( name, node, callback) {
    this.removeService(name, NODE_SERVICE_TYPE, node, callback);
}

/**
 * Deploys service to the bridge
 * @param {(string|Buffer)} file The absolute file path to the repository (Node.js or xUML), a Buffer with repository content or the absolute directory path to pack and deploy.
 * @param {{startup: boolean, overwrite: boolean, overwrite_settings: boolean}} options Deployment options
 * @param {function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Bridge.prototype.deployService = function( file, options, callback) {

    var self = this;

    if( typeof options === 'function'){
        callback = options;
        options = {};
    }

    if( Buffer.isBuffer(file)){
        self._logInAndPerform(function(innerCallback) {
            self._deployService('repository.zip', file, options, innerCallback);
        }, callback);
    } else {
        fs.stat(file, function(err, stat){
            var repositoryPath;
            if (err) {
                return callback({ errorType: "Filesystem error", error: err});
            }

            if(stat.isDirectory()){
                repositoryPath = path.resolve(file, repositoryName(file));

                pack(file, {output: repositoryPath}, function(err){
                    if (err) {
                        return callback({ errorType: "Pack error", error: err});
                    }

                    file = repositoryPath;

                    fs.readFile(file, function (err, data) {
                        if (err) {
                            return callback({ errorType: "Filesystem error", error: err});
                        }

                        self._logInAndPerform(function (innerCallback) {
                            self._deployService(path.basename(file), data, options, innerCallback);
                        }, function(err){
                            fs.unlink(file,function(){
                                callback(err);
                            });
                        });
                    });

                });
            } else {
                fs.readFile(file, function (err, data) {
                    if (err) {
                        return callback({ errorType: "Filesystem error", error: err});
                    }

                    self._logInAndPerform(function (innerCallback) {
                        self._deployService(path.basename(file), data, options, innerCallback);
                    }, callback);
                });
            }
        });
    }
}

/**
 * Does the real deployment work.
 *
 * @param {string} filename The name of the file we're uploading
 * @param {Buffer} data     Content of the file.
 * @param {{startup: boolean, overwrite: boolean, overwrite_settings: boolean}} options  Options regarding startup,
 * overwriting and settings overwriting.
 * @param {function(?Object=)} callback  Called when done. If everything goes smoothly, parameter will be null.
 * @private
 */
Bridge.prototype._deployService = function(filename, data, options, callback) {

    var self = this;

    if( !Buffer.isBuffer( data)){
        throw new TypeError('Data is expected to be a Buffer, "' + (typeof data) + '" given');
    }

    var form = {
        $isUpload: true,
        input_repository: {
            value: data,
            fieldOptions: {
                filename: filename,
                contentType: REPOSITORY_CONTENT_TYPE
            }
        },
        action_UPLOAD: 'UPLOAD'
    };

    if( options.startup){
        form.input_startup = 'true';
    }
    if( options.overwrite){
        form.input_overwrite = 'true';
    }
    if( options.overwrite_settings){
        form.input_overwrite_settings = 'true';
    }

    _executeRequest(self._composeRequestObject( FIRMWARE_DEPLOY_ENDPOINT), form, callback);
}



/**
 * Pack a directory
 * @param {(string)} directory The absolute directory path.
 * @param {string|{output: string}} options Packing options
 * @param {function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
function pack( directory, options, callback) {

    if(!options){
        options = {};
    }

    if( typeof options === 'function'){
        callback = options;
        options = {};
    }

    if (typeof options === "string") {
        options = { output: options }
    }

    fs.readdir(directory, function(err){
        try {
            var output = path.resolve(directory, archiveName(directory)); // this also ensures that 'directory' contains a valid node.js package
        } catch (e) {
            return callback({errorType: "Pack error", error: e});
        }

        if (options.output) {
            output = options.output;
        }

        if(err){
            return callback({ errorType: "Filesystem error", error: err});
        }

        repository.pack(directory, output, callback);
    });
}

/**
 * Builds a archive file name from package.json in directory 'directory'. The filename
 * will be '<package.name>-<package.version>.zip'. If some information an exception is thrown.
 *
 * @param {string} directory the package's directory
 * @returns {string} the repository file name
 */
function archiveName(directory) {
    var pkg = require('package')(directory);
    if (pkg && pkg.name && pkg.version) {
        return pkg.name + '-' + pkg.version + '.zip';
    } else {
        throw {errorType: 'Pack error', error: new Error('package.json is incomplete')};
    }
}

module.exports = Bridge;

module.exports.pack = pack;
