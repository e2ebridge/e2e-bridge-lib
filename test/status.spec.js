let helper = require('./helper');
let nock = require('nock');
const path = require('path');

describe('Service status', function() {
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

    describe('xUML service', function() {

        function endpoint(tail) {
            return serviceUriPath('xuml', helper.xUmlServiceInstance, tail);
        }

        beforeAll(function(done) {
            if(!helper.integrationEnabled()) {
                return done();
            }

            const repository = path.resolve(__dirname, `data/${helper.xUmlServiceInstance}.rep`);
            helper
                .makeBridgeInstance()
                .deployService(
                    repository,
                    {overwrite: true, overwritePrefs: true},
                    function(err) {
                        expect(err).toBeFalsy();
                        done();
                    });
        });

        it('starts & stops', function(done) {
            scope.put(endpoint('/start'))
                .reply(200, undefined);
            scope.put(endpoint('/stop'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startXUMLService(
                helper.xUmlServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();

                    helper.makeBridgeInstance().stopXUMLService(
                        helper.xUmlServiceInstance,
                        function(err) {
                            expect(err).toBeFalsy();
                            scope.done();
                            done();
                        });
                });
        });

        it('dies', function(done) {
            scope.put(endpoint('/start'))
                .reply(200, undefined);
            scope.put(endpoint('/kill'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startXUMLService(
                helper.xUmlServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();

                    helper.makeBridgeInstance().killXUMLService(
                        helper.xUmlServiceInstance,
                        function(err) {
                            expect(err).toBeFalsy();
                            scope.done();
                            done();
                        });
                });
        });

        it('shows status', function(done) {

            const response = {
                name: helper.xUmlServiceInstance,
                type: 'xUML',
                status: 'Stopped'
            };

            scope.get(endpoint(''))
                .reply(200, response);

            helper.makeBridgeInstance().getXUMLServiceStatus(helper.xUmlServiceInstance, function(err, res) {
                expect(err).toBeFalsy();
                expect(res).toEqual(response);
                scope.done();
                done();
            });
        });

        it('shows sessions', function(done) {

            const response = {session: []};

            scope.get(endpoint('/sessions'))
                .reply(200, response);

            helper.makeBridgeInstance().listXUMLServiceSessions(
                helper.xUmlServiceInstance,
                function(err, res) {
                    expect(err).toBeFalsy();
                    expect(res).toEqual(response);
                    scope.done();
                    done();
                });
        });

        it('shows extended information', function(done) {

            const response = {
                restInfo: [
                    {
                        id: 'TickerRESTService:api',
                        active: true,
                        openAPI: '',
                        port: 17700,
                        tryItOutUrl: '',
                        url: ''
                    }
                ],
                soapInfo: [
                    {
                        active: true,
                        port: 55555,
                        shadowPort: true,
                        url: '',
                        wsdl: ''
                    },
                    {
                        active: true,
                        port: 57700,
                        shadowPort: true,
                        url: '',
                        wsdl: ''
                    },
                    {
                        active: true,
                        port: 57700,
                        shadowPort: true,
                        url: '',
                        wsdl: ''
                    }
                ],
                category: "Ticker",
                serviceUrl: ""
            };

            scope.get(endpoint('/info'))
                .reply(200, response);

            helper.makeBridgeInstance().getXUMLServiceInfo(helper.xUmlServiceInstance, function(err, res) {
                expect(err).toBeFalsy();
                expect(res['restInfo']).toBeDefined();
                expect(res['restInfo'].length).toEqual(1);
                const restPort = res['restInfo'][0];
                expect(restPort['id']).toEqual('TickerRESTService:api');
                expect(res['soapInfo']).toBeDefined();
                expect(res['soapInfo'].length).toEqual(3);
                res['soapInfo'].forEach(i => expect(i['shadowPort']).toEqual(true));
                expect(res['category']).toEqual('Ticker');
                scope.done();
                done();
            });
        });
    });

    describe('Node.js service', function() {

        function endpoint(tail) {
            return serviceUriPath('nodejs', helper.nodeJsServiceInstance, tail);
        }

        beforeAll(function(done) {
            if(!helper.integrationEnabled()) {
                return done();
            }

            const repository = path.resolve(__dirname, `data/${helper.nodeJsServiceInstance}.zip`);
            helper
                .makeBridgeInstance()
                .deployService(
                    repository,
                    {overwrite: true, overwritePrefs: true},
                    function(err) {
                        expect(err).toBeFalsy();
                        done();
                    });
        });

        it('starts & stops', function(done) {
            scope.put(endpoint('/start'))
                .reply(200, undefined);
            scope.put(endpoint('/stop'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startNodeService(
                helper.nodeJsServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();

                    helper.makeBridgeInstance().stopNodeService(
                        helper.nodeJsServiceInstance,
                        function(err) {
                            expect(err).toBeFalsy();
                            scope.done();
                            done();
                        });
                });
        });

        it('dies', function(done) {
            scope.put(endpoint('/start'))
                .reply(200, undefined);
            scope.put(endpoint('/kill'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startNodeService(
                helper.nodeJsServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();

                    helper.makeBridgeInstance().killNodeService(
                        helper.nodeJsServiceInstance,
                        function(err) {
                            expect(err).toBeFalsy();
                            scope.done();
                            done();
                        });
                });
        });

        it('shows status', function(done) {

            const response = {
                name: helper.nodeJsServiceInstance,
                type: 'NodeJs',
                status: 'Stopped',
                version: '0.0.1'
            };

            scope.get(endpoint(''))
                .reply(200, response);

            helper.makeBridgeInstance().getNodeServiceStatus(
                helper.nodeJsServiceInstance,
                function(err, res) {
                    expect(err).toBeFalsy();
                    expect(res).toEqual(response);
                    scope.done();
                    done();
                });
        });
    });

    describe('java service', function() {

        function endpoint(tail) {
            return serviceUriPath('java', helper.javaServiceInstance, tail);
        }

        beforeAll(function(done) {
            if(!helper.integrationEnabled()) {
                return done();
            }

            const repository = path.resolve(__dirname, `data/${helper.javaServiceInstance}.jar`);
            helper
                .makeBridgeInstance()
                .deployService(
                    repository,
                    {overwrite: true, overwritePrefs: true},
                    function(err) {
                        expect(err).toBeFalsy();
                        done();
                    });
        });

        it('starts & stops', function(done) {
            scope.put(endpoint('/start'))
                .reply(200, undefined);
            scope.put(endpoint('/stop'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startJavaService(
                helper.javaServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();

                    helper.makeBridgeInstance().stopJavaService(
                        helper.javaServiceInstance,
                        function(err) {
                            expect(err).toBeFalsy();
                            scope.done();
                            done();
                        });
                });
        });

        it('dies', function(done) {
            scope.put(endpoint('/start'))
                .reply(200, undefined);
            scope.put(endpoint('/kill'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startJavaService(
                helper.javaServiceInstance,
                function(err) {
                    expect(err).toBeFalsy();

                    helper.makeBridgeInstance().killJavaService(
                        helper.javaServiceInstance,
                        function(err) {
                            expect(err).toBeFalsy();
                            scope.done();
                            done();
                        });
                });
        });

        it('shows status', function(done) {

            const response = {
                name: helper.javaServiceInstance,
                type: 'Java',
                status: 'Stopped',
                version: '0.0.1'
            };

            scope.get(endpoint(''))
                .reply(200, response);

            helper.makeBridgeInstance().getJavaServiceStatus(
                helper.javaServiceInstance,
                function(err, res) {
                    expect(err).toBeFalsy();
                    expect(res).toEqual(response);
                    scope.done();
                    done();
                });
        });
    });
});
