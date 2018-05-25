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
