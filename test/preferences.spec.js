let helper = require('./helper');
let nock = require('nock');

function makeChangedPreferences(preferences, changes) {
    const result = JSON.parse(JSON.stringify(preferences)); // deep copy
    Object.keys(changes).forEach(p => {
        result[p] = changes[p];
    });
    return result;
}

describe( "Preferences module", function() {
    let scope;
    const serviceUriPath = `/bridge/rest/services/xuml/${helper.xUmlServiceInstance}`;
    const serviceUri = `${helper.base}/${serviceUriPath}`;

    const links = [
        {
            "rel": "self",
            "href": `${serviceUri}/preferences`
        },
        {
            "rel": "http://e2e.ch/bridge/service",
            "href": serviceUri
        }
    ];

    const preferences = {
        "bridgeServerLogLevel": "Info",
        "transactionLogLevel": "None",
        "transactionLogRotInterval": "DAILY",
        "automaticStartup": false,
        "automaticRestart": false,
        "owner": "admin"
    };

    function makeResponseObject(preferencesToInclude) {
        let result = {
            "service": helper.xUmlServiceInstance,
            "link": links
        };
        Object.keys(preferencesToInclude).forEach(p => {
            result[p] = preferencesToInclude[p];
        });
        return result;
    }

    beforeEach(function(done) {

        scope = nock(helper.base);
        if(process.env.NOCK_OFF === 'true') {
            helper.makeBridgeInstance().setXUMLServicePreferences(helper.xUmlServiceInstance,
                preferences,
                function(/*err, res*/) {
                    done();
                }
            );
        } else {
            done();
        }
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it("can query", function(done){

        scope.get(`${serviceUriPath}/preferences`)
             .reply(200, makeResponseObject(preferences));

        helper.makeBridgeInstance().getXUMLServicePreferences(helper.xUmlServiceInstance, function(err, res) {
            expect(err).toBeFalsy();

            expect(res).toEqual(preferences);

            scope.done();
            done();
        });
    });

    it("can change string value", function(done){

        const changes = {"bridgeServerLogLevel": "Debug"};
        const preferencesAfter = makeChangedPreferences(preferences, changes);

        scope.get(`${serviceUriPath}/preferences`)
             .reply(200, makeResponseObject(preferences));

        scope.put(`${serviceUriPath}/preferences`, preferencesAfter)
             .reply(200, undefined);

        helper.makeBridgeInstance().setXUMLServicePreferences(helper.xUmlServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();

                expect(res).toEqual(preferencesAfter);

                scope.done();
                done();
            }
        );
    });

    it("can change boolean value", function(done){

        const changes = {"automaticStartup": true};
        const preferencesAfter = makeChangedPreferences(preferences, changes);

        scope.get(`${serviceUriPath}/preferences`)
            .reply(200, makeResponseObject(preferences));

        scope.put(`${serviceUriPath}/preferences`, preferencesAfter)
            .reply(200, undefined);

        helper.makeBridgeInstance().setXUMLServicePreferences(helper.xUmlServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();

                expect(res).toEqual(preferencesAfter);

                scope.done();
                done();
            }
        );
    });

    it("can change multiple values", function(done){

        const changes = {
            "automaticRestart": true,
            "transactionLogLevel": "Service",
            "bridgeServerLogLevel": "Warning"
        };
        const preferencesAfter = makeChangedPreferences(preferences, changes);

        scope.get(`${serviceUriPath}/preferences`)
            .reply(200, makeResponseObject(preferences));

        scope.put(`${serviceUriPath}/preferences`, preferencesAfter)
            .reply(200, undefined);

        helper.makeBridgeInstance().setXUMLServicePreferences(helper.xUmlServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();

                expect(res).toEqual(preferencesAfter);

                scope.done();
                done();
            }
        );
    });
});
