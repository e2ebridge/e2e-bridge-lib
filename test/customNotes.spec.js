let helper = require('./helper');
let nock = require('nock');

describe("Custom notes", function() {
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

    const referenceNotes = "<h1>This model is awesome!</h1>";

    it("can be uploaded", function(done) {

        scope.put(endpoint('/customnotes'), referenceNotes)
            .reply(200, undefined);

        helper.makeBridgeInstance().setXUMLCustomNotes(helper.xUmlServiceInstance, referenceNotes, function(err) {
            expect(err).toBeFalsy();
            scope.done();
            done();
        });

    });

    it("can be downloaded", function(done) {

        scope.get(endpoint('/customnotes'))
            .reply(200, referenceNotes);

        helper.makeBridgeInstance().getXUMLCustomNotes(helper.xUmlServiceInstance, function(err, notes) {
            expect(err).toBeFalsy();
            expect(notes).toEqual(referenceNotes);
            scope.done();
            done();
        });

    });
});
