let helper = require('./helper');
let nock = require('nock');

describe( "Custom notes", function() {
    let scope;
    function endpoint(tail) {
        return `/bridge/rest/services/xuml/${helper.xUmlServiceInstance}${tail}`;
    }

    beforeEach(function() {
        scope = nock(helper.base);
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it("can be downloaded", function(done) {

        helper.skipIntegration();

        const response = "<h1>This model is awesome!</h1>";

        scope.get(endpoint('/customnotes'))
            .reply(200, response);

        helper.makeBridgeInstance().getXUMLCustomNotes(helper.xUmlServiceInstance, function (err, notes) {
            expect(err).toBeFalsy();
            expect(notes).toEqual(response);
            scope.done();
            done();
        });

    });
});
