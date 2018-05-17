let helper = require('./helper');
let nock = require('nock');

describe( "Service", function() {
    let scope;

    beforeEach(function() {
        scope = nock(helper.base)
            .post('/admin/Console/Welcome', `j_username=${helper.user}&j_password=${helper.password}&action_SUBMIT=Login`)
                .reply(302, undefined, { "Location": `${helper.base}/admin/Console/Welcome` } )

            .get('/admin/Console/Welcome')
                .reply(200, helper.okMsg);
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it("can be started", function(done){
        scope
            .post('/admin/Console/BridgeInstanceConfiguration', "action_START=Start")
                .query({"node": helper.node,"instance": helper.serviceInstance})
                .reply(302, undefined, { "Location": `${helper.base}/admin/Console/BridgeInstanceConfiguration` })
            .get('/admin/Console/BridgeInstanceConfiguration')
                .reply(200, helper.okMsg);

        helper.makeBridgeInstance().startXUMLService(helper.serviceInstance, helper.node, function(err) {
            expect(err).toBe(undefined);
            scope.done();
            done();
        });
    });

    it("can be stopped", function(done){
        scope
            .post('/admin/Console/BridgeInstanceConfiguration', "action_STOP=Stop")
                .query({"node": helper.node,"instance": helper.serviceInstance})
                .reply(302, undefined, { "Location": `${helper.base}/admin/Console/BridgeInstanceConfiguration` })
            .get('/admin/Console/BridgeInstanceConfiguration')
                .reply(200, helper.okMsg);

        helper.makeBridgeInstance().stopXUMLService(helper.serviceInstance, helper.node, function(err) {
            expect(err).toBe(undefined);
            scope.done();
            done();
        });
    });
});

/*
remove to ensure it's not already deployed
deploy service started
get settings
set settings
get REST
get settings
get preferences
set preferences
get preferences
stop
get REST
start
get REST
deploy no overwriting settings and prefs
get settings
get preferences
deploy with overwriting
get settings
get preferences
deploy no overwriting service
kill service
remove
get settings
 */