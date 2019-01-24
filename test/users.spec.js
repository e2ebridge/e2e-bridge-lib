let helper = require('./helper');
let nock = require('nock');

describe("Users", function() {
    let scope;
    const endpoint = function(id) { return '/bridge/rest/users' + (id ? ('/' + id) : ''); };

    const gugus = {
        "id": "Gugus",
        "name": "Gugus, James",
        "active": true,
        "group": "admin",
        "role": "ADMIN"
    };

    const response = {
        "link": [
            {
                "rel": "self",
                "href": `${helper.base}${endpoint}`
            }
        ],
        "user": [gugus]
    };

    const gugus2 = {
        "id": "Gugus",
        "name": "Gugus, James",
        "active": false,
        "group": "admin",
        "role": "ADMIN"
    };

    const response2 = {
        "link": [
            {
                "rel": "self",
                "href": `${helper.base}${endpoint}`
            }
        ],
        "user": [gugus2]
    };

    beforeEach(function() {
        scope = nock(helper.base);
    });

    beforeAll(function(done) {
        if(!helper.integrationEnabled()) {
            return done();
        }
        helper.makeBridgeInstance().removeUser('Gugus', function() { done(); });
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it("can be listed", function(done) {

        scope.get(endpoint())
            .reply(200, response);

        helper.makeBridgeInstance().listUsers(function(err, list) {
            expect(err).toBeFalsy();
            expect(Array.isArray(list['user'])).toBeTruthy();
            list['user'].forEach(function(f) {
                expect(f.id).toBeDefined();
                expect(f.name).toBeDefined();
                expect(f.active).toBeDefined();
                expect(f.group).toBeDefined();
                expect(f.role).toBeDefined();
            });
            scope.done();
            done();
        });
    });

    it("can be created", function(done) {

        scope.post(endpoint('Gugus') + '?name=Gugus%2C%20James&active=true&group=admin&password=xxx')
            .reply(200, {});

        helper.makeBridgeInstance().createUser(
            {...gugus, password: 'xxx'},
            function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
    });

    it("can be retrieved", function(done) {

        scope.get(endpoint('Gugus'))
            .reply(200, response);

        helper.makeBridgeInstance().getUser(
            'Gugus',
            function(err, res) {
                    expect(err).toBeFalsy();
                    expect(res['user'][0]).toEqual(gugus);
                    scope.done();
                    done();
                });
    });

    it("can be modified", function(done) {

        scope.put(endpoint('Gugus') + '?active=false&password=yyy')
            .reply(200, {});
        scope.get(endpoint('Gugus'))
            .reply(200, response2);

        const input = { id: gugus2.id, active: gugus2.active, password: 'yyy' };
        let instance = helper.makeBridgeInstance();
        instance.modifyUser(
            input,
            function(err) {
                expect(err).toBeFalsy();
                instance.getUser(
                    'Gugus',
                    function(err, res) {
                        expect(err).toBeFalsy();
                        expect(res['user'][0]).toEqual(gugus2);
                        scope.done();
                        done();
                    });
            });
    });

    it("can be deleted", function(done) {

        scope.delete(endpoint('Gugus'))
            .reply(200, {});

        helper.makeBridgeInstance().removeUser(
            'Gugus',
            function(err) {
                    expect(err).toBeFalsy();
                    scope.done();
                    done();
                });
    });


});
