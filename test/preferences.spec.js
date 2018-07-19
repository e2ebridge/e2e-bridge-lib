let helper = require('./helper');
let nock = require('nock');
const path = require('path');

function makeChangedPreferences(preferences, changes) {
    const result = JSON.parse(JSON.stringify(preferences)); // deep copy
    Object.keys(changes).forEach(p => {
        result[p] = changes[p];
    });
    return result;
}

describe("Service preferences", function() {
    let scope;

    function serviceUriPath(serviceType, serviceName, tail) {
        return `/bridge/rest/services/${serviceType}/${serviceName}${tail}`;
    }

    function makeResponseObject(preferencesToInclude) {
        let result = {};
        Object.keys(preferencesToInclude).forEach(p => {
            result[p] = preferencesToInclude[p];
        });
        return result;
    }

    function setupTest(changes, endpoint, preferences) {
        const preferencesAfter = makeChangedPreferences(preferences, changes);

        scope.get(endpoint)
            .reply(200, makeResponseObject(preferences));

        scope.put(endpoint, preferencesAfter)
            .reply(200, undefined);

        return preferencesAfter;
    }

    describe('xUML service', function() {

        const preferences = {
            "bridgeServerLogLevel": "Info",
            "transactionLogLevel": "None",
            "transactionLogRotInterval": "DAILY",
            "automaticStartup": false,
            "automaticRestart": false,
            "owner": "admin"
        };

        function endpoint() {
            return serviceUriPath('xuml', helper.xUmlServiceInstance, '/preferences');
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

        beforeEach(function(done) {
            scope = nock(helper.base);

            if(!helper.integrationEnabled()) {
                return done();
            }

            helper.makeBridgeInstance().setXUMLServicePreferences(
                helper.xUmlServiceInstance,
                preferences,
                function(/*err, res*/) {
                    done();
                });
        });

        afterAll(function() {
            nock.cleanAll();
        });

        it("can query", function(done) {

            scope.get(endpoint())
                .reply(200, makeResponseObject(preferences));

            helper.makeBridgeInstance().getXUMLServicePreferences(
                helper.xUmlServiceInstance,
                function(err, res) {
                    expect(err).toBeFalsy();
                    Object.keys(preferences).forEach(p => {
                        expect(res[p]).toEqual(preferences[p]);
                    });
                    scope.done();
                    done();
                });
        });

        it("can change string value", function(done) {

            const changes = {"bridgeServerLogLevel": "Debug"};
            const preferencesAfter = setupTest(changes, endpoint(), preferences);

            helper.makeBridgeInstance().setXUMLServicePreferences(
                helper.xUmlServiceInstance,
                changes,
                function(err, res) {
                    expect(err).toBeFalsy();

                    Object.keys(preferencesAfter).forEach(p => {
                        expect(res[p]).toEqual(preferencesAfter[p]);
                    });

                    scope.done();
                    done();
                }
            );
        });

        it("can change boolean value", function(done) {

            const changes = {"automaticStartup": true};
            const preferencesAfter = setupTest(changes, endpoint(), preferences);

            helper.makeBridgeInstance().setXUMLServicePreferences(
                helper.xUmlServiceInstance,
                changes,
                function(err, res) {
                    expect(err).toBeFalsy();

                    Object.keys(preferencesAfter).forEach(p => {
                        expect(res[p]).toEqual(preferencesAfter[p]);
                    });

                    scope.done();
                    done();
                }
            );
        });

        it("can change multiple values", function(done) {

            const changes = {
                "automaticRestart": true,
                "transactionLogLevel": "Service",
                "bridgeServerLogLevel": "Warning"
            };
            const preferencesAfter = setupTest(changes, endpoint(), preferences);

            helper.makeBridgeInstance().setXUMLServicePreferences(
                helper.xUmlServiceInstance,
                changes,
                function(err, res) {
                    expect(err).toBeFalsy();

                    Object.keys(preferencesAfter).forEach(p => {
                        expect(res[p]).toEqual(preferencesAfter[p]);
                    });

                    scope.done();
                    done();
                }
            );
        });

        it("can't change unknown preference", function(done) {

            const changes = {"gugus": true};

            scope.get(endpoint())
                .reply(200, makeResponseObject(preferences));

            helper.makeBridgeInstance().setXUMLServicePreferences(
                helper.xUmlServiceInstance,
                changes,
                function(err, res) {
                    expect(err).toBeTruthy();
                    expect(err['errorType']).toEqual("Usage error");
                    scope.done();
                    done();
                }
            );
        });

        it("can't change preference to wrong type", function(done) {

            const changes = {"automaticRestart": "true"};

            scope.get(endpoint())
                .reply(200, makeResponseObject(preferences));

            helper.makeBridgeInstance().setXUMLServicePreferences(
                helper.xUmlServiceInstance,
                changes,
                function(err, res) {
                    expect(err).toBeTruthy();
                    expect(err['errorType']).toEqual("Usage error");
                    scope.done();
                    done();
                }
            );
        });
    });

    describe('Node.js service', function() {

        const preferences = {
            "automaticStartup": false,
            "automaticRestart": false,
            "minimumUptimeInSeconds": 10,
            "owner": "admin"
        };

        function endpoint() {
            return serviceUriPath('nodejs', helper.nodeJsServiceInstance, '/preferences');
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

        beforeEach(function(done) {
            scope = nock(helper.base);

            if(!helper.integrationEnabled()) {
                return done();
            }

            helper.makeBridgeInstance().setNodeServicePreferences(
                helper.nodeJsServiceInstance,
                preferences,
                function(/*err, res*/) {
                    done();
                });
        });

        afterAll(function() {
            nock.cleanAll();
        });

        it("can query", function(done) {

            scope.get(endpoint())
                .reply(200, makeResponseObject(preferences));

            helper.makeBridgeInstance().getNodeServicePreferences(
                helper.nodeJsServiceInstance,
                function(err, res) {
                    expect(err).toBeFalsy();
                    Object.keys(preferences).forEach(p => {
                        expect(res[p]).toEqual(preferences[p]);
                    });
                    scope.done();
                    done();
                });
        });

        it("can change some values", function(done) {

            const changes = {
                "automaticRestart": true,
                "minimumUptimeInSeconds": 15,
            };
            const preferencesAfter = setupTest(changes, endpoint(), preferences);

            helper.makeBridgeInstance().setNodeServicePreferences(
                helper.nodeJsServiceInstance,
                changes,
                function(err, res) {
                    expect(err).toBeFalsy();

                    Object.keys(preferencesAfter).forEach(p => {
                        expect(res[p]).toEqual(preferencesAfter[p]);
                    });

                    scope.done();
                    done();
                }
            );
        });
    });

    describe('java service', function() {

        const preferences = {
            "automaticStartup": false,
            "automaticRestart": false,
            "minimumUptimeInSeconds": 10,
            "uiTabTitle": "User Interface",
            "owner": "admin",
            "remoteDebugPort": null
        };

        function endpoint() {
            return serviceUriPath('java', helper.javaServiceInstance, '/preferences');
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

        beforeEach(function(done) {
            scope = nock(helper.base);

            if(!helper.integrationEnabled()) {
                return done();
            }

            helper.makeBridgeInstance().setJavaServicePreferences(
                helper.javaServiceInstance,
                preferences,
                function(/*err, res*/) {
                    done();
                });
        });

        afterAll(function() {
            nock.cleanAll();
        });

        it("can query", function(done) {

            scope.get(endpoint())
                .reply(200, makeResponseObject(preferences));

            helper.makeBridgeInstance().getJavaServicePreferences(
                helper.javaServiceInstance,
                function(err, res) {
                    expect(err).toBeFalsy();
                    Object.keys(preferences).forEach(p => {
                        expect(res[p]).toEqual(preferences[p]);
                    });
                    scope.done();
                    done();
                });
        });

        it("can change some values", function(done) {

            const changes = {
                "automaticRestart": true,
                "minimumUptimeInSeconds": 15,
            };
            const preferencesAfter = setupTest(changes, endpoint(), preferences);

            helper.makeBridgeInstance().setJavaServicePreferences(
                helper.javaServiceInstance,
                changes,
                function(err, res) {
                    expect(err).toBeFalsy();

                    Object.keys(preferencesAfter).forEach(p => {
                        expect(res[p]).toEqual(preferencesAfter[p]);
                    });

                    scope.done();
                    done();
                }
            );
        });
    });
});
