let helper = require('./helper');
let nock = require('nock');
const path = require('path');

describe("Model notes", function() {
    let scope;

    function endpoint() {
        return `/bridge/rest/services/xuml/${helper.xUmlServiceInstance}/modelnotes`;
    }

    beforeEach(function() {
        scope = nock(helper.base);
    });

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

    afterAll(function() {
        nock.cleanAll();
    });

    it('can list and download', function(done) {

        const listResponse = {
            notes: [
                {
                    name: helper.xUmlServiceInstance,
                    href: `${helper.xUmlServiceInstance}_119091974.txt`
                }
            ]
        };

        scope.get(endpoint())
            .reply(200, listResponse);

        helper.makeBridgeInstance().getXUMLModelNotesList(
            helper.xUmlServiceInstance,
            function(err, list) {
                expect(err).toBeFalsy();
                expect(list['notes'][0].name).toEqual(helper.xUmlServiceInstance);
                expect(list['notes'][0].href)
                    .toMatch(new RegExp(`.*${helper.xUmlServiceInstance}_+[0-9]+\\.((txt)|(html))`));

                const noteName = path.basename(list['notes'][0].href);
                const response =
                    "Author:e2e.example.user.\n" +
                    "Created:8/12/16 8:57 AM.\n" +
                    "Title:.\n" +
                    "Comment:.\n";

                scope.get(endpoint() + `/${noteName}`)
                    .reply(200, response);

                helper.makeBridgeInstance().getXUMLModelNotes(
                    helper.xUmlServiceInstance,
                    noteName,
                    function(err, notes) {
                        expect(err).toBeFalsy();
                        expect(notes).toContain('Author');
                        scope.done();
                        done();
                    });
            });
    });
});
