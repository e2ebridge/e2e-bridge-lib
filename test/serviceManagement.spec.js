let helper = require('./helper');
let nock = require('nock');

describe( "Services", function() {
    let scope;
    function serviceUriPath(serviceType, serviceName, tail) {
        return `/bridge/rest/services/${serviceType}/${serviceName}${tail}`;
    }

    beforeEach(function() {
        scope = nock(helper.base);
    });

    afterAll(function() {
        nock.cleanAll();
    });

    describe('type', function() {
        describe("'xUML'", function () {

            function endpoint(tail) {
                return serviceUriPath('xuml', helper.xUmlServiceInstance, tail);
            }

            it("can be started", function (done) {
                scope.put(endpoint('/start'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().startXUMLService(helper.xUmlServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can be stopped", function (done) {
                scope.put(endpoint('/stop'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().stopXUMLService(helper.xUmlServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can be killed", function (done) {

                helper.skipIntegration();

                scope.put(endpoint('/kill'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().killXUMLService(helper.xUmlServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can be removed", function (done) {

                helper.skipIntegration();

                scope.delete(endpoint(''))
                    .reply(200, undefined);

                helper.makeBridgeInstance().removeXUMLService(helper.xUmlServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can get status", function (done) {

                const response = {
                    name: helper.xUmlServiceInstance,
                    type: 'xUML',
                    status: 'Stopped'
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().getXUMLServiceStatus(helper.xUmlServiceInstance, function (err, res) {
                    expect(err).toBeFalsy();
                    expect(res).toEqual(response);
                    scope.done();
                    done();
                });
            });

            it("can get extended information", function (done) {

                const response = {
                    "restInfo": [],
                    "soapInfo": [],
                    "category": "RTREST",
                    "serviceUrl": `${helper.base}/admin/Console/BridgeInstanceConfiguration?node=${helper.host}&instance=${helper.xUmlServiceInstance}`
                };

                scope.get(endpoint('/info'))
                    .reply(200, response);

                helper.makeBridgeInstance().getXUMLServiceInfo(helper.xUmlServiceInstance, function (err, res) {
                    expect(err).toBeFalsy();
                    expect(res.restInfo).toBeDefined();
                    expect(res.soapInfo).toBeDefined();
                    expect(res.category).toBeDefined();
                    expect(res.serviceUrl).toBeDefined();
                    scope.done();
                    done();
                });
            });

            it("can get repository", function (done) {

                // note: this is a valid, empty zip file
                const zip = Buffer.from([
                    0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

                scope.get(endpoint('/repository'))
                    .reply(200, zip);

                helper.makeBridgeInstance().getXUMLServiceRepository(helper.xUmlServiceInstance, function (err, res) {
                    expect(err).toBeFalsy();
                    expect(Buffer.isBuffer(res)).toBeTruthy();
                    expect(res.indexOf(Buffer.from([0x50, 0x4b]))).toEqual(0); // 'PK' magic
                    expect(res.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBeTruthy(); // central directory
                    scope.done();
                    done();
                });
            });

            it("can get session list", function (done) {

                helper.skipIntegration();

                const response = {
                    "session": [
                        {
                            "sessionID": "4",
                            "link": [
                                {
                                    "rel": "http://e2e.ch/bridge/session",
                                    "href": "https://localhost:8080/bridge/rest/services/xuml/ThreadExample/sessions/4"
                                }
                            ],
                            "transactionID": "00000001ab7f28ad000212eb4a7fc700e8b6e3f7",
                            "startTime": "2018-05-29T10:43:47.500901Z",
                            "callStack": [
                                "wait",
                                "urn:Services.ThreadService.ThreadPortType.ThreadPortType.wait",
                                "Sleep_a_while"
                            ]
                        }
                    ]
                };

                scope.get(endpoint('/sessions'))
                    .reply(200, response);

                helper.makeBridgeInstance().listXUMLServiceSessions(helper.xUmlServiceInstance, function (err, res) {
                    expect(err).toBeFalsy();
                    expect(Array.isArray(res.session)).toBeTruthy();
                    const session = res.session[0];
                    expect(session.sessionID).toBeDefined();
                    expect(Array.isArray(session.link)).toBeTruthy();
                    expect(session.transactionID).toBeDefined();
                    expect(session.startTime).toBeDefined();
                    expect(Array.isArray(session.callStack)).toBeDefined();
                    scope.done();
                    done();
                });
            });

            it("can cancel a session", function (done) {

                helper.skipIntegration();

                scope.delete(endpoint('/sessions/4'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().cancelXUMLServiceSession(helper.xUmlServiceInstance, '4', function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });
        });

        describe("'node'", function () {

            function endpoint(tail) {
                return serviceUriPath('nodejs', helper.nodeJsServiceInstance, tail);
            }

            it("can be started", function (done) {
                scope.put(endpoint('/start'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().startNodeService(helper.nodeJsServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can be stopped", function (done) {
                scope.put(endpoint('/stop'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().stopNodeService(helper.nodeJsServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can be removed", function (done) {

                helper.skipIntegration();

                scope.delete(endpoint(''))
                    .reply(200, undefined);

                helper.makeBridgeInstance().removeNodeService(helper.nodeJsServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can be listed", function (done) {

                helper.skipIntegration();

                const response = {
                    "service": [
                        {
                            "name": helper.nodeJsServiceInstance,
                            "type": "NodeJs",
                            "status": "Stopped",
                            "href": endpoint('')
                        }
                    ]
                };

                scope.get('/bridge/rest/services/nodejs')
                    .reply(200, response);

                helper.makeBridgeInstance().listNodeServices(function (err, services) {
                    expect(err).toBeFalsy();
                    expect(services).toEqual(response);
                    scope.done();
                    done();
                });
            });

            it("can get status", function (done) {

                const response = {
                    name: helper.nodeJsServiceInstance,
                    type: 'NodeJs',
                    status: 'Stopped'
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().getNodeServiceStatus(helper.nodeJsServiceInstance, function (err, res) {
                    expect(err).toBeFalsy();
                    expect(res).toEqual(response);
                    scope.done();
                    done();
                });
            });
        });

        describe("'java'", function () {

            function endpoint(tail) {
                return serviceUriPath('java', helper.javaServiceInstance, tail);
            }

            it("can be started", function (done) {

                helper.skipIntegration();

                scope.put(endpoint('/start'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().startJavaService(helper.javaServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can be stopped", function (done) {

                helper.skipIntegration();

                scope.put(endpoint('/stop'))
                    .reply(200, undefined);

                helper.makeBridgeInstance().stopJavaService(helper.javaServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can be removed", function (done) {

                helper.skipIntegration();

                scope.delete(endpoint(''))
                    .reply(200, undefined);

                helper.makeBridgeInstance().removeJavaService(helper.javaServiceInstance, function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
            });

            it("can get status", function (done) {

                helper.skipIntegration();

                const response = {
                    name: helper.javaServiceInstance,
                    type: 'Java',
                    status: 'Stopped'
                };

                scope.get(endpoint(''))
                    .reply(200, response);

                helper.makeBridgeInstance().getJavaServiceStatus(helper.javaServiceInstance, function (err, res) {
                    expect(err).toBeFalsy();
                    expect(res).toEqual(response);
                    scope.done();
                    done();
                });
            });
        });
    });

    describe('deployment', function() {

        const body = /^.*\r\nContent-Disposition: form-data; name="uploadFile"; filename="repository.zip"\r\nContent-Type: application\/zip\r\n\r\ngugus\r\n.*\r\n$/

        it("works", function (done) {

            helper.skipIntegration();

            scope.post('/bridge/rest/services', body)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                Buffer.from('gugus'),
                {},
                function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });

        it("passes parameters", function (done) {

            helper.skipIntegration();

            scope.post('/bridge/rest/services?overwrite=false&overwritePrefs=false&startup=true&npmInstall=false&runScripts=false&instanceName=xxxy', body)
                .reply(200, undefined);

            helper.makeBridgeInstance().deployService(
                Buffer.from('gugus'),
                {
                    overwrite: false,
                    overwritePrefs: false,
                    startup: true,
                    npmInstall: false,
                    runScripts: false,
                    instanceName: 'xxxy',
                },
                function (err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                }
            );
        });
    });
});
