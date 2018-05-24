let helper = require('./helper');
let nock = require('nock');

describe( "Service type", function() {
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

    describe("'xUML'", function() {

        function endpoint(tail) {
            return serviceUriPath('xuml', helper.xUmlServiceInstance, tail);
        }

        it("can be started", function(done){
            scope.put(endpoint('/start'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startXUMLService(helper.xUmlServiceInstance, function(err) {
                expect(err).toBeFalsy();
                scope.done();
                done();
            });
        });

        it("can be stopped", function(done){
            scope.put(endpoint('/stop'))
                .reply(200, undefined);

            helper.makeBridgeInstance().stopXUMLService(helper.xUmlServiceInstance, function(err) {
                expect(err).toBeFalsy();
                scope.done();
                done();
            });
        });

        it("can be killed", function(done){

            helper.skipIntegration();

            scope.put(endpoint('/kill'))
                .reply(200, undefined);

            helper.makeBridgeInstance().killXUMLService(helper.xUmlServiceInstance, function(err) {
                expect(err).toBeFalsy();
                scope.done();
                done();
            });
        });
    });

    describe("'node'", function() {

        function endpoint(tail) {
            return serviceUriPath('nodejs', helper.nodeJsServiceInstance, tail);
        }

        it("can be started", function(done){
            scope.put(endpoint('/start'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startNodeService(helper.nodeJsServiceInstance, function(err) {
                expect(err).toBeFalsy();
                scope.done();
                done();
            });
        });

        it("can be stopped", function(done){
            scope.put(endpoint('/stop'))
                .reply(200, undefined);

            helper.makeBridgeInstance().stopNodeService(helper.nodeJsServiceInstance, function(err) {
                expect(err).toBeFalsy();
                scope.done();
                done();
            });
        });
    });

    describe("'java'", function() {

        function endpoint(tail) {
            return serviceUriPath('java', helper.javaServiceInstance, tail);
        }

        it("can be started", function(done){

            helper.skipIntegration();

            scope.put(endpoint('/start'))
                .reply(200, undefined);

            helper.makeBridgeInstance().startJavaService(helper.javaServiceInstance, function(err) {
                expect(err).toBeFalsy();
                scope.done();
                done();
            });
        });

        it("can be stopped", function(done){

            helper.skipIntegration();

            scope.put(endpoint('/stop'))
                .reply(200, undefined);

            helper.makeBridgeInstance().stopJavaService(helper.javaServiceInstance, function(err) {
                expect(err).toBeFalsy();
                scope.done();
                done();
            });
        });
    });
});
