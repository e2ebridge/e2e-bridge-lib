/**
 * Copyright: E2E Technologies Ltd
 * @author: Jakub Zakrzewski <jzakrzewski@e2e.ch>
 */

/*global define require */
"use strict";

const request = require('request');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const _ = require('lodash');

const repository = require('./lib/repository');
const endpoints = require('./lib/endpoints');

const BRIDGE_REST_API_BASE = '/bridge/rest';
const XUML_SERVICE_TYPE = 'xUML';
const NODE_SERVICE_TYPE = 'node';
const JAVA_SERVICE_TYPE = 'java';

const HTTP_DELETE = 'DELETE';
const HTTP_GET = 'GET';
const HTTP_HEAD = 'HEAD';
const HTTP_OPTIONS = 'OPTIONS';
const HTTP_PATCH = 'PATCH';
const HTTP_POST = 'POST';
const HTTP_PUT = 'PUT';

// TRACE & CONNECT are N/A

/**
 * Handle results of any Bridge API operation.
 * @callback bridgeApiCallback
 * @param {?Object} err Error object if error occurred.
 * @param {?Object=} response Response object if no error occurred.
 */

/**
 * Handle results of any Bridge API operation (no response values are expected).
 * @callback bridgeApiNoResponseCallback
 * @param {?Object} err Error object if error occurred.
 */

/**
 * @typedef {Object} DeploymentOptions
 * @property {?boolean} startup
 * @property {?boolean} overwritePrefs
 * @property {?boolean} npmInstall
 * @property {?boolean} runScripts
 * @property {?string} instanceName
 * @property {?boolean} preserveNodeModules
 * @property {?number} stopTimeout @since BridgeAPI 2.9.0
 * @property {?boolean} allowKill @since BridgeAPI 2.9.0
 */

const deploymentOptions = Object.freeze({
    STARTUP: "startup",
    OVERWRITE: "overwrite",
    SETTINGS: "overwritePrefs",
    NPM_SCRIPTS: "runScripts",
    NPM_INSTALL: "npmInstall",
    INSTANCE_NAME: "instanceName",
    PRESERVE_NODE_MODULES: "preserveNodeModules",
    STOP_TIMEOUT: "stopTimeout", /// @since BridgeAPI 2.9.0
    ALLOW_KILL: "allowKill", /// @since BridgeAPI 2.9.0
});

/** @type !Readonly<DeploymentOptions> */
const defaultDeploymentOptions = Object.freeze({
    [deploymentOptions.STARTUP]: false,
    [deploymentOptions.OVERWRITE]: false,
    [deploymentOptions.SETTINGS]: false,
    [deploymentOptions.NPM_INSTALL]: false,
    [deploymentOptions.NPM_SCRIPTS]: false,
    [deploymentOptions.INSTANCE_NAME]: undefined,
    [deploymentOptions.PRESERVE_NODE_MODULES]: false,
    [deploymentOptions.STOP_TIMEOUT]: undefined,
    [deploymentOptions.ALLOW_KILL]: false,
});

/**
 * @typedef {Object} StopOptions
 * @since BridgeAPI 2.9.0
 * @property {?number} stopTimeout
 */

const stopOptions = Object.freeze({
    STOP_TIMEOUT: "stopTimeout",
});

/** @type !Readonly<StopOptions> */
const defaultStopOptions = Object.freeze({
    [stopOptions.STOP_TIMEOUT]: undefined,
});

/**
 * Bridge object
 * @param {string} protocol
 * @param {string} host
 * @param {number} port
 * @param {?string} user
 * @param {?string} password
 * @constructor
 */
function Bridge(protocol, host, port, user, password) {
    if (protocol && !(protocol === 'http' || protocol === 'https')) {
        throw new Error(`Unsupported protocol '${protocol}'. Allowed protocols: 'http' or 'https'`);
    }
    this._protocol = protocol || 'https';
    this._host = host || 'localhost';
    this._port = port || 8080;
    this._user = user;
    this._password = password;
}

/**
 * Pack a directory
 * @param {(string)} directory The absolute directory path.
 * @param {string|{output: string}|bridgeApiNoResponseCallback} options Packing options or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
function pack(directory, options, callback) {

    if(!options) {
        options = {};
    }

    if(typeof options === 'function') {
        callback = options;
        options = {};
    }

    if(typeof options === 'string') {
        options = {output: options}
    }

    fs.readdir(directory, function(err) {
        if(err) {
            return callback({errorType: "Filesystem error", error: err});
        }

        try {
            var output = path.resolve(archiveName(directory)); // this also ensures that 'directory' contains a valid node.js package
        } catch(e) {
            return callback({errorType: "Pack error", error: e});
        }

        if(options.output) {
            output = options.output;
        }

        repository.pack(directory, output, options, callback);
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
    const pkg = require('package')(directory);
    if(pkg && pkg.name && pkg.version) {
        return pkg.name + '-' + pkg.version + '.zip';
    } else {
        throw {errorType: 'Pack error', error: new Error('package.json is incomplete')};
    }
}

/**
 * Default callback for REST Bridge API
 * @type {bridgeApiCallback|bridgeApiNoResponseCallback}
 */
function _defaultCallback(err, response) {
    if(err) {
        console.error(err);
    } else if(response) {
        console.log(response);
    }
}

/**
 * Remove technical properties from the response.
 * These shouldn't be interesting for the library user.
 * @param {bridgeApiCallback} next Callback to call after cleanup.
 * @param {?Object} error Error object. Will not be cleaned. Will be forwarded to callback.
 * @param {?Object=} response Response object. Will be cleaned. Cleaned version will be forwarded to callback.
 * @returns {*} whatever the callback returns.
 * @private
 */
function _cleanResponse(next, error, response) {
    if(response) {
        if(!Array.isArray(response.service)) {
            delete response.service;
        }
        delete response.link;
    }
    return next(error, response);
}

/**
 * Runs the REST request according to given options.
 * @param {Object} options Valid options for the request module.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 * @private
 */
function _executeRequest(options, callback) {

    if(!callback) {
        callback = _defaultCallback;
    } else {
        callback = _cleanResponse.bind(null, callback);
    }

    request(options,
        function(error, response, body) {
            if(!error && response.statusCode === 200) {
                callback(null, body)
            } else if(!error) {
                callback({errorType: "Bridge error", error: body});
            } else {
                callback({errorType: "HTTP error", error: {details: error, response: response}});
            }
        });
}

/**
 * Prepare settings for request module.
 * @param {!string} method Valid HTTP verb (GET, POST, PUT...)
 * @param {!string} endpoint Bridge endpoint, we intend to call
 * @param {?Object=} content Body to send with the request. Valid for POST, PUT and PATCH.
 * @param {?Object=} getParams URI GET parameters to attach to endpoint (key-value pairs)
 * @returns {Object}
 * @private
 */
Bridge.prototype._composeRequestObject = function(method, endpoint, content, getParams) {

    let self = this;

    method = method.toUpperCase();

    let ret = {
        "url": `${self._protocol}://${self._host}:${self._port}${BRIDGE_REST_API_BASE}${endpoint}`,
        "qs": getParams,
        "method": method,
        "strictSSL": false, //because bridge uses self-signed certificate
        "followAllRedirects": true,
        "auth": {
            "user": self._user,
            "pass": self._password,
            "sendImmediately": true
        }
    };

    if(content && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        ret.json = content;
    } else {
        ret.json = true;
    }

    return ret;
};

/**
 * Prepare settings for request module for download request.
 * @param {!string} endpoint Bridge endpoint, we intend to call
 * @param {?boolean=} isBinary Whether binary response is expected.
 * @param {?Object=} getParams URI GET parameters to attach to endpoint (key-value pairs)
 * @returns {Object}
 * @private
 */
Bridge.prototype._composeDownloadRequest = function(endpoint, isBinary, getParams) {
    let self = this;

    const requestObject = self._composeRequestObject(HTTP_GET, endpoint, null, getParams);
    requestObject.json = false;
    if(isBinary) {
        requestObject.encoding = null;
    }
    return requestObject;
};

/**
 * Deploys service to the bridge
 * @param {(string|Buffer)} file The absolute file path to the repository (Node.js or xUML), a Buffer with repository content or the absolute directory path to pack and deploy.
 * @param {DeploymentOptions|function(?Object=)} options Deployment options
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.deployService = function(file, options, callback) {

    let self = this;

    if(!callback && typeof options === 'function') {
        callback = options;
        options = null;
    }

    const requestObject = self._composeRequestObject(
        HTTP_POST,
        endpoints.getServicesEndpoint(HTTP_POST)
    );

    requestObject.qs = options;

    if(Buffer.isBuffer(file)) {
        requestObject.formData = {
            uploadFile: {
                value: file,
                options: {
                    filename: 'repository.zip'
                }
            }
        };
        _executeRequest(requestObject, callback);
    } else {
        fs.stat(file, function(err, stat) {
            if(err) {
                return callback({errorType: "Filesystem error", error: err});
            }

            if(stat.isDirectory()) {
                let repositoryPath = tmp.fileSync({prefix: archiveName(file)}).name;

                pack(file, {output: repositoryPath}, function(err) {
                    if(err) {
                        return callback({errorType: "Pack error", error: err});
                    }

                    file = repositoryPath;

                    requestObject.formData = {uploadFile: fs.createReadStream(file)};
                    _executeRequest(requestObject, function(err) {
                        fs.unlink(file, function() {
                            callback(err);
                        });
                    });

                });
            } else {
                requestObject.formData = {
                    uploadFile: {
                        value: fs.createReadStream(file),
                        options: {}
                    }};
                if(path.extname(file) === ".rep") {
                    // The '.rep' extension resolves to some MIME type from a vnd tree,
                    // so we overwrite it here. Not strictly required but avoids confusion.
                    requestObject.formData.uploadFile.options['contentType'] = 'application/zip';
                }
                _executeRequest(requestObject, callback);
            }
        });
    }
};

/**
 * List deployed services of given type or all.
 * @param {?string} serviceType 'xUML', 'node', or 'java'. If null, all services will be listed.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listServices = function(serviceType, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            serviceType
            ? endpoints.getServiceEndpoint(HTTP_GET, serviceType)
            : endpoints.getServicesEndpoint(HTTP_GET)),
        callback);
};

/**
 * List all deployed services.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listAllServices = function(callback) {
    let self = this;
    return self.listServices(null, callback);
};

/**
 * List deployed xUML services.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listXUMLServices = function(callback) {
    let self = this;
    return self.listServices(XUML_SERVICE_TYPE, callback);
};

/**
 * List deployed Node.js services.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listNodeServices = function(callback) {
    let self = this;
    return self.listServices(NODE_SERVICE_TYPE, callback);
};

/**
 * List deployed java services.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listJavaServices = function(callback) {
    let self = this;
    return self.listServices(JAVA_SERVICE_TYPE, callback);
};

/**
 * Start, stop or kill services.
 * @param {!string} status 'start', 'stop' or 'kill'. Note, that 'kill' will not work for node.js services
 * @param {!string} name Name of the service.
 * @param {!string} serviceType 'xUML', 'node', or 'java'
 * @param {(StopOptions|bridgeApiNoResponseCallback)=} options Additional options or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setServiceStatus = function(status, name, serviceType, options, callback) {
    let self = this;

    if(!options) {
        options = {};
    }

    if(typeof options === 'function') {
        callback = options;
        options = {};
    }

    _executeRequest(
        self._composeRequestObject(
            HTTP_PUT,
            endpoints.getServiceEndpoint(HTTP_PUT, serviceType, name, status),
            undefined,
            options),
        callback);
};

/**
 * Starts xUML service
 *
 * @param {!string} name Name of the service.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.startXUMLService = function(name, callback) {
    this.setServiceStatus("start", name, XUML_SERVICE_TYPE, callback);
};

/**
 * Stops xUML service
 *
 * @param {!string} name Name of the service.
 * @param {(StopOptions|bridgeApiNoResponseCallback)=} options Additional options or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.stopXUMLService = function(name, options, callback) {
    this.setServiceStatus("stop", name, XUML_SERVICE_TYPE, options, callback);
};

/**
 * Kills xUML service
 *
 * @param {!string} name Name of the service.
 * @param {(StopOptions|bridgeApiNoResponseCallback)=} options Additional options or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.killXUMLService = function(name, options, callback) {
    this.setServiceStatus("kill", name, XUML_SERVICE_TYPE, options, callback);
};

/**
 * Starts Node.js service
 *
 * @param {!string} name Name of the service.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.startNodeService = function(name, callback) {
    this.setServiceStatus("start", name, NODE_SERVICE_TYPE, callback);
};

/**
 * Stops Node.js service
 *
 * @param {!string} name Name of the service.
 * @param {(StopOptions|bridgeApiNoResponseCallback)=} options Additional options or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.stopNodeService = function(name, options, callback) {
    this.setServiceStatus("stop", name, NODE_SERVICE_TYPE, options, callback);
};

/**
 * Kills Node.js service
 *
 * @param {!string} name Name of the service.
 * @param {(StopOptions|bridgeApiNoResponseCallback)=} options Additional options or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.killNodeService = function(name, options, callback) {
    this.setServiceStatus("kill", name, NODE_SERVICE_TYPE, options, callback);
};

/**
 * Starts Java service
 *
 * @param {!string} name Name of the service.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.startJavaService = function(name, callback) {
    this.setServiceStatus("start", name, JAVA_SERVICE_TYPE, callback);
};

/**
 * Stops Java service
 *
 * @param {!string} name Name of the service.
 * @param {(StopOptions|bridgeApiNoResponseCallback)=} options Additional options or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.stopJavaService = function(name, options, callback) {
    this.setServiceStatus("stop", name, JAVA_SERVICE_TYPE, options, callback);
};

/**
 * Kills Java service
 *
 * @param {!string} name Name of the service.
 * @param {(StopOptions|bridgeApiNoResponseCallback)=} options Additional options or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.killJavaService = function(name, options, callback) {
    this.setServiceStatus("kill", name, JAVA_SERVICE_TYPE, options, callback);
};

/**
 * Queries the status of a service
 * @param {!string} name Name of the service.
 * @param {!string} serviceType 'xUML', 'node', or 'java'
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getServiceStatus = function(name, serviceType, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getServiceEndpoint(HTTP_GET, serviceType, name)),
        callback);
};

/**
 * Queries the status of a xUML service
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLServiceStatus = function(name, callback) {
    this.getServiceStatus(name, XUML_SERVICE_TYPE, callback);
};

/**
 * Queries the status of a Node.js service
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getNodeServiceStatus = function(name, callback) {
    this.getServiceStatus(name, NODE_SERVICE_TYPE, callback);
};

/**
 * Queries the status of a Java service
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getJavaServiceStatus = function(name, callback) {
    this.getServiceStatus(name, JAVA_SERVICE_TYPE, callback);
};

/**
 * Get extended information about a xUML service
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLServiceInfo = function(name, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getServiceEndpoint(HTTP_GET, XUML_SERVICE_TYPE, name, 'info')),
        callback);
};

/**
 * Get list of available model notes for the given xUML service
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLModelNotesList = function(name, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getServiceEndpoint(HTTP_GET, XUML_SERVICE_TYPE, name, 'modelnotes')),
        callback);
};

/**
 * Get model notes of the xUML service
 * @param {!string} name Name of the service.
 * @param {!string} notesFilename Name of the notes file to fetch.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLModelNotes = function(name, notesFilename, callback) {
    let self = this;

    _executeRequest(
        self._composeDownloadRequest(
            endpoints.getServiceEndpoint(
                HTTP_GET, XUML_SERVICE_TYPE, name, 'modelnotes', notesFilename)),
        callback);
};

/**
 * Get custom model notes of the xUML service
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLCustomNotes = function(name, callback) {
    let self = this;

    _executeRequest(
        self._composeDownloadRequest(
            endpoints.getServiceEndpoint(
                HTTP_GET, XUML_SERVICE_TYPE, name, 'customnotes')),
        callback);
};

/**
 * Get custom model notes of the xUML service
 * @param {!string} name Name of the service.
 * @param {!string|!Buffer|!ReadStream} content The new content of the custom model notes.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setXUMLCustomNotes = function(name, content, callback) {
    let self = this;

    const requestObject = self._composeRequestObject(
        HTTP_PUT,
        endpoints.getServiceEndpoint(HTTP_PUT, XUML_SERVICE_TYPE, name, 'customnotes')
    );

    requestObject.json = false;
    requestObject.body = content;

    _executeRequest(requestObject, callback);
};

/**
 * Export repository of the xUML service
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLServiceRepository = function(name, callback) {
    let self = this;

    _executeRequest(
        self._composeDownloadRequest(
            endpoints.getServiceEndpoint(
                HTTP_GET, XUML_SERVICE_TYPE, name, 'repository'),
            true
        ),
        callback);
};

/**
 * Remove service from the Bridge
 * @param {!string} name Name of the service.
 * @param {!string} serviceType 'xUML', 'node', or 'java'
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.removeService = function(name, serviceType, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_DELETE,
            endpoints.getServiceEndpoint(HTTP_DELETE, serviceType, name)),
        callback);
};

/**
 * Removes xUML service from given node
 *
 * @param {!string} name Name of the service.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.removeXUMLService = function(name, callback) {
    this.removeService(name, XUML_SERVICE_TYPE, callback);
};

/**
 * Removes Node.js service from given node
 *
 * @param {!string} name Name of the service.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.removeNodeService = function(name, callback) {
    this.removeService(name, NODE_SERVICE_TYPE, callback);
};

/**
 * Removes Java service from given node
 *
 * @param {!string} name Name of the service.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.removeJavaService = function(name, callback) {
    this.removeService(name, JAVA_SERVICE_TYPE, callback);
};

/**
 * Get list of currently running sessions of the given service.
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listXUMLServiceSessions = function(name, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getServiceEndpoint(HTTP_GET, XUML_SERVICE_TYPE, name, 'sessions')),
        callback);
};

/**
 * Cancel a running session of the given service.
 * @param {!string} name Name of the service.
 * @param {!string} sessionId Id of the session to cancel.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.cancelXUMLServiceSession = function(name, sessionId, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_DELETE,
            endpoints.getServiceEndpoint(
                HTTP_DELETE, XUML_SERVICE_TYPE, name, 'sessions', sessionId)),
        callback);
};

/**
 * Get currently active preferences of the given service.
 * @param {!string} name Name of the service.
 * @param {!string} serviceType valid service type: 'xUML', 'node'...
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getServicePreferences = function(name, serviceType, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getServiceEndpoint(HTTP_GET, serviceType, name, 'preferences')),
        callback);
};

/**
 * Get currently active preferences of the given xUML service.
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLServicePreferences = function(name, callback) {
    let self = this;
    self.getServicePreferences(name, XUML_SERVICE_TYPE, callback);
};

/**
 * Get currently active preferences of the given Node.js service.
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getNodeServicePreferences = function(name, callback) {
    let self = this;
    self.getServicePreferences(name, NODE_SERVICE_TYPE, callback);
};

/**
 * Get currently active preferences of the given Java service.
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getJavaServicePreferences = function(name, callback) {
    let self = this;
    self.getServicePreferences(name, JAVA_SERVICE_TYPE, callback);
};

/**
 * Get currently active settings of the given service.
 * @param {!string} name Name of the service.
 * @param {!string} serviceType valid service type: 'xUML', 'node'...
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getServiceSettings = function(name, serviceType, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getServiceEndpoint(HTTP_GET, serviceType, name, 'settings')),
        callback);
};

/**
 * Get currently active preferences of the given xUML service.
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLServiceSettings = function(name, callback) {
    let self = this;
    self.getServiceSettings(name, XUML_SERVICE_TYPE, callback);
};

/**
 * Get currently active preferences of the given Node.js service.
 * @param {!string} name Name of the service.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getNodeServiceSettings = function(name, callback) {
    let self = this;
    self.getServiceSettings(name, NODE_SERVICE_TYPE, callback);
};

/**
 * Set service preferences.
 * @param {!string} name Name of the service.
 * @param {!string} serviceType valid service type: 'xUML', 'node'...
 * @param {!Object} preferences Hash of the service preferences. Possible keys depend on service type.
 *                              Refer to Bridge API documentation.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setServicePreferences = function(name, serviceType, preferences, callback) {
    let self = this;

    let getCallback = function(error, currentPreferences) {
        if(error) {
            return callback(error);
        }

        let correct = Object.keys(preferences).every(function(k) {
            if(!currentPreferences.hasOwnProperty(k)) {
                callback({
                    errorType: "Usage error",
                    error: {details: "Property '" + k + "' is unknown to the Bridge."}
                });
                return false;
            } else if(typeof currentPreferences[k] !== typeof preferences[k]) {
                callback({errorType: "Usage error", error: {details: "Property '" + k + "' has a wrong type."}});
                return false;
            }
            return true;
        });

        if(!correct) {
            return;
        }

        let newPreferences = Object.assign({}, currentPreferences, preferences);
        _executeRequest(
            self._composeRequestObject(
                HTTP_PUT,
                endpoints.getServiceEndpoint(HTTP_PUT, serviceType, name, 'preferences'),
                newPreferences),
            function(error, response) {
                if(!error) {
                    response = newPreferences;
                }
                callback(error, response);
            });
    };

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getServiceEndpoint(HTTP_GET, serviceType, name, 'preferences')),
        getCallback);
};

/**
 * Set xUML service preferences.
 * @param {!string} name Name of the service.
 * @param {!Object} preferences Hash of the service preferences. For possible keys refer to Bridge API documentation.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setXUMLServicePreferences = function(name, preferences, callback) {
    let self = this;
    self.setServicePreferences(name, XUML_SERVICE_TYPE, preferences, callback);
};

/**
 * Set Node.js service preferences.
 * @param {!string} name Name of the service.
 * @param {!Object} preferences Hash of the service preferences. For possible keys refer to Bridge API documentation.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setNodeServicePreferences = function(name, preferences, callback) {
    let self = this;
    self.setServicePreferences(name, NODE_SERVICE_TYPE, preferences, callback);
};

/**
 * Set Java service preferences.
 * @param {!string} name Name of the service.
 * @param {!Object} preferences Hash of the service preferences. For possible keys refer to Bridge API documentation.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setJavaServicePreferences = function(name, preferences, callback) {
    let self = this;
    self.setServicePreferences(name, JAVA_SERVICE_TYPE, preferences, callback);
};

function mergeXUMLSettings(changes, currentSettings) {
    let newSettings = {setting: []};
    let error = null;
    Object.keys(changes).every(function(k) {
        let referenceSetting = currentSettings.setting.find(x => x.id === k);
        if(!referenceSetting) {
            error = {errorType: "Usage error", error: {details: "Setting '" + k + "' is unknown to the Bridge."}};
            return false;
        }
        newSettings.setting.push({"id": k, "currentValue": changes[k]});
        return true;
    });
    return {error, newSettings};
}

function mergeNodeSettings(changes, currentSettings) {
    return { error:null, newSettings: _.merge({}, currentSettings, changes)};
}


/**
 * Set service settings.
 * @param {!string} name Name of the service.
 * @param {!string} serviceType valid service type: 'xUML', 'node'...
 * @param {!Object} settings Hash of the service settings. Possible keys depend on service type.
 *                              Refer to Bridge API documentation.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setServiceSettings = function(name, serviceType, settings, callback) {
    let self = this;

    let getCallback = function(err, currentSettings) {
        if(err) {
            return callback(err);
        }

        const {error, newSettings} = serviceType === XUML_SERVICE_TYPE
                                     ? mergeXUMLSettings(settings, currentSettings)
                                     : mergeNodeSettings(settings, currentSettings);
        if(error) {
            return callback(error);
        }

        _executeRequest(
            self._composeRequestObject(
                HTTP_PUT,
                endpoints.getServiceEndpoint(HTTP_PUT, serviceType, name, 'settings'),
                newSettings),
            function(error, response) {
                if(!error) {
                    _executeRequest(
                        self._composeRequestObject(
                            HTTP_GET,
                            endpoints.getServiceEndpoint(HTTP_GET, serviceType, name, 'settings')),
                        callback);
                } else {
                    callback(error);
                }
            });
    };

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getServiceEndpoint(HTTP_GET, serviceType, name, 'settings')),
        getCallback);
};

/**
 * Set xUML service settings.
 * @param {!string} name Name of the service.
 * @param {!Object} settings Hash of the service settings. For possible keys refer to Bridge API documentation.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setXUMLServiceSettings = function(name, settings, callback) {
    let self = this;
    self.setServiceSettings(name, XUML_SERVICE_TYPE, settings, callback);
};

/**
 * Set Node.js service settings.
 * @param {!string} name Name of the service.
 * @param {!Object} settings Hash of the service settings. For possible keys refer to Bridge API documentation.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.setNodeServiceSettings = function(name, settings, callback) {
    let self = this;
    self.setServiceSettings(name, NODE_SERVICE_TYPE, settings, callback);
};

/**
 * List resources of the given type.
 * @param {!string} type Valid resource type: 'resource', 'java', 'xslt'.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listXUMLResources = function(type, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getXUMLResourcesEndpoint(HTTP_GET, type)),
        callback);
};

/**
 * List resources of the 'resource' type.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listXUMLResourceResources = function(callback) {
    let self = this;
    self.listXUMLResources('resource', callback);
};

/**
 * List resources of the 'java' type.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listXUMLJavaResources = function(callback) {
    let self = this;
    self.listXUMLResources('java', callback);
};

/**
 * List resources of the 'xslt' type.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listXUMLXsltResources = function(callback) {
    let self = this;
    self.listXUMLResources('xslt', callback);
};

/**
 * Upload resources of the given type.
 * @param {!string} type Valid resource type: 'resource', 'java', 'xslt'.
 * @param {!string|!Buffer|!ReadStream} content The resource content.
 * @param {?string|bridgeApiNoResponseCallback=} filename Name of the resource or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.uploadXUMLResources = function(type, content, filename, callback) {
    let self = this;

    if(typeof filename === 'function') {
        callback = filename;
        filename = undefined;
    }

    const requestObject = self._composeRequestObject(
        HTTP_POST,
        endpoints.getXUMLResourcesEndpoint(HTTP_POST, type)
    );

    if(filename) {
        requestObject.formData = {
            uploadFile: {
                value: content,
                options: {
                    filename
                }
            }
        };
    } else {
        requestObject.formData = {uploadFile: content};
    }

    _executeRequest(requestObject, callback);
};

/**
 * Upload resources of the 'resource' type.
 * @param {!string|!Buffer|!ReadStream} content The resource content.
 * @param {?string|bridgeApiNoResponseCallback=} filename Name of the resource or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.uploadXUMLResourceResources = function(content, filename, callback) {
    let self = this;
    self.uploadXUMLResources('resource', content, filename, callback);
};

/**
 * Upload resources of the 'java' type.
 * @param {!string|!Buffer|!ReadStream} content The resource content.
 * @param {?string|bridgeApiNoResponseCallback=} filename Name of the resource or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.uploadXUMLJavaResources = function(content, filename, callback) {
    let self = this;
    self.uploadXUMLResources('java', content, filename, callback);
};

/**
 * Upload resources of the 'xslt' type.
 * @param {!string|!Buffer|!ReadStream} content The resource content.
 * @param {?string|bridgeApiNoResponseCallback=} filename Name of the resource or the callback.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.uploadXUMLXsltResources = function(content, filename, callback) {
    let self = this;
    self.uploadXUMLResources('xslt', content, filename, callback);
};

/**
 * Delete resources of the given type.
 * @param {!string} type Valid resource type: 'resource', 'java', 'xslt'.
 * @param {!string} name Name of the resource.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.deleteXUMLResources = function(type, name, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_DELETE,
            endpoints.getXUMLResourcesEndpoint(HTTP_DELETE, type, name)),
        callback);
};

/**
 * Delete resources of the 'resource' type.
 * @param {!string} name Name of the resource.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.deleteXUMLResourceResources = function(name, callback) {
    let self = this;
    self.deleteXUMLResources('resource', name, callback);
};

/**
 * Delete resources of the 'java' type.
 * @param {!string} name Name of the resource.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.deleteXUMLJavaResources = function(name, callback) {
    let self = this;
    self.deleteXUMLResources('java', name, callback);
};

/**
 * Delete resources of the 'xslt' type.
 * @param {!string} name Name of the resource.
 * @param {bridgeApiNoResponseCallback=} callback Function to call upon completion.
 */
Bridge.prototype.deleteXUMLXsltResources = function(name, callback) {
    let self = this;
    self.deleteXUMLResources('xslt', name, callback);
};

/**
 * Get resources of the given type.
 * @param {!string} type Valid resource type: 'resource', 'java', 'xslt'.
 * @param {!string} name Name of the resource.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLResources = function(type, name, callback) {
    let self = this;

    _executeRequest(
        self._composeDownloadRequest(
            endpoints.getXUMLResourcesEndpoint(HTTP_GET, type, name),
            true),
        callback);
};

/**
 * Get resources of the 'resource' type.
 * @param {!string} name Name of the resource.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLResourceResources = function(name, callback) {
    let self = this;
    self.getXUMLResources('resource', name, callback);
};

/**
 * Get resources of the 'java' type.
 * @param {!string} name Name of the resource.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLJavaResources = function(name, callback) {
    let self = this;
    self.getXUMLResources('java', name, callback);
};

/**
 * Get resources of the 'xslt' type.
 * @param {!string} name Name of the resource.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getXUMLXsltResources = function(name, callback) {
    let self = this;
    self.getXUMLResources('xslt', name, callback);
};

/**
 * List xUML variables.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listXUMLVariables = function(callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getXUMLEndpoint(HTTP_GET, 'variables')),
        callback);
};

/**
 * List user groups.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listGroups = function(callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getEndpoint(HTTP_GET, 'groups')),
        callback);
};

/**
 * Retrieve user group.
 * @param {!string} id Group id.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getGroup = function(id, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getEndpoint(HTTP_GET, 'groups', id)),
        callback);
};

/**
 * Create user group.
 * @param {!Object} group Group.
 * @param {!string} group.id Group id.
 * @param {!string} group.name Group name.
 * @param {!string} group.role The role this group represents.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.createGroup = function(group, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_POST,
            endpoints.getEndpoint(HTTP_POST, 'groups', group.id),
            undefined,
            { name: group.name, role: group.role }),
        callback);
};

/**
 * Modify user group.
 * @param {!Object} group Group.
 * @param {!string} group.id Group id - identifies which group to change.
 * @param {!string} group.name Group name.
 * @param {!string} group.role The role this group represents.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.modifyGroup = function(group, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_PUT,
            endpoints.getEndpoint(HTTP_PUT, 'groups', group.id),
            undefined,
            { name: group.name, role: group.role }),
        callback);
};

/**
 * Remove user group.
 * @param {!string} id Group id - identifies which group to remove.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.removeGroup = function(id, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_DELETE,
            endpoints.getEndpoint(HTTP_DELETE, 'groups', id)),
        callback);
};

/**
 * List users.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.listUsers = function(callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getEndpoint(HTTP_GET, 'users')),
        callback);
};

/**
 * Retrieve user.
 * @param {!string} id User id.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.getUser = function(id, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_GET,
            endpoints.getEndpoint(HTTP_GET, 'users', id)),
        callback);
};

/**
 * Take only those parameters from user that are needed to build the query string
 * @param {!Object} user input
 */
function _userToQueryParameters(user) {
    let params = {};
    ['name', 'active', 'group', 'password'].forEach( i => params[i] = user[i]);
    return params;
}

/**
 * Create users.
 * @param {!Object} user User.
 * @param {!string} user.id User id.
 * @param {!string} user.name User name.
 * @param {boolean} user.active Whether the user is active or not.
 * @param {!string} user.group The group the user belongs to.
 * @param {!string} user.password User's password.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.createUser = function(user, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_POST,
            endpoints.getEndpoint(HTTP_POST, 'users', user.id),
            undefined,
            _userToQueryParameters(user)),
        callback);
};

/**
 * Create user.
 * @param {!Object} user User.
 * @param {!string} user.id User id - identifies which user to modify.
 * @param {string} user.name User name.
 * @param {boolean} user.active Whether the user is active or not.
 * @param {string} user.group The group the user belongs to.
 * @param {string} user.password User's password.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.modifyUser = function(user, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_PUT,
            endpoints.getEndpoint(HTTP_PUT, 'users', user.id),
            undefined,
            _userToQueryParameters(user)),
        callback);
};

/**
 * Remove user.
 * @param {!string} id User id - identifies which user to remove.
 * @param {bridgeApiCallback=} callback Function to call upon completion.
 */
Bridge.prototype.removeUser = function(id, callback) {
    let self = this;

    _executeRequest(
        self._composeRequestObject(
            HTTP_DELETE,
            endpoints.getEndpoint(HTTP_DELETE, 'users', id)),
        callback);
};

/**
 * Factory function for the Bridge instances
 * @param {string} protocol
 * @param {string} host
 * @param {number} port
 * @param {?string} user
 * @param {?string} password
 * @constructs Bridge
 */
function createInstance(protocol, host, port, user, password) {
    return new Bridge(protocol, host, port, user, password);
}

/** Exports **/
module.exports = Bridge;
module.exports.pack = pack;
module.exports.createInstance = createInstance;
module.exports.deploymentOptions = deploymentOptions;
module.exports.stopOptions = stopOptions;
module.exports.defaultDeploymentOptions = defaultDeploymentOptions;
module.exports.defaultStopOptions = defaultStopOptions;
module.exports.XUML_SERVICE_TYPE = XUML_SERVICE_TYPE;
module.exports.NODE_SERVICE_TYPE = NODE_SERVICE_TYPE;
module.exports.JAVA_SERVICE_TYPE = JAVA_SERVICE_TYPE;
