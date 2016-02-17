var expect = chai.expect;

describe("Personal Consumer", function() {
    var oauth = new OAuth({
        consumer: {
            public: 'sZT0SD2jf84lCdF8PWTLQ',
            secret: 'u25CRWvCpCB61ndpRHgiQ5EkioqNB7cPL43uQ3bk'
        },
        signature_method: 'HMAC-SHA1'
    });

    var token = {
        public: '61260444-Esv29YumfnPt4A7l5uyYWp6Sm6zJBMKmdY6kwLFH5',
        secret: 'gfNAhxRs9WjSfAtju570RRNTrbD1TyJNANq0cuYUoD7T9'
    };

    describe("#Get user timeline", function() {
        this.timeout(10000);

        var request = {
            url: 'https://api.twitter.com/1.1/statuses/user_timeline.json',
            method: 'GET'
        };

        it("should be an array of tweets", function(done) {
            $.ajax({
                url: request.url,
                type: request.method,
                data: oauth.authorize(request, token)
            }).done(function(body) {
                expect(body).to.be.an.instanceof(Array);
                done();
            });
        });
    });

    describe("#Get user timeline limit 5", function() {
        this.timeout(10000);

        var request = {
            url: 'https://api.twitter.com/1.1/statuses/user_timeline.json',
            method: 'GET',
            data: {
                count: 5
            }
        };

        it("should be an array of tweets (length 5)", function(done) {
            $.ajax({
                url: request.url,
                type: request.method,
                data: oauth.authorize(request, token)
            }).done(function(body) {
                expect(body).to.be.an.instanceof(Array);
                expect(body).to.have.length(5);
                done();
            });
        });
    });

    describe("#Get user timeline by header", function() {
        this.timeout(10000);

        var request = {
            url: 'https://api.twitter.com/1.1/statuses/user_timeline.json',
            method: 'GET'
        };

        it("should be an array of tweets", function(done) {
            $.ajax({
                url: request.url,
                type: request.method,
                data: request.data,
                headers: oauth.toHeader(oauth.authorize(request, token))
            }).done(function(body) {
                expect(body).to.be.an.instanceof(Array);
                done();
            });
        });
    });

    describe.skip("#Tweet", function() {
        this.timeout(10000);

        var text = 'Testing oauth-1.0a';

        var request = {
            url: 'https://api.twitter.com/1.1/statuses/update.json',
            method: 'POST',
            data: {
                status: text
            }
        };

        it("should be an success object", function(done) {
            $.ajax({
                url: request.url,
                type: request.method,
                data: oauth.authorize(request, token)
            }).done(function(body) {
                expect(body).to.have.property('entities');
                expect(body).to.have.property('created_at');
                expect(body).to.have.property('id');
                expect(body).to.have.property('text');
                expect(body.text).to.equal(text);
                expect(body.user).to.be.an('object');
                done();
            });
        });
    });

    describe.skip("#Tweet by header", function() {
        this.timeout(10000);

        var text = 'Testing oauth-1.0a';

        var request = {
            url: 'https://api.twitter.com/1.1/statuses/update.json',
            method: 'POST',
            data: {
                status: text
            }
        };

        it("should be an success object", function(done) {
            $.ajax({
                url: request.url,
                type: request.method,
                data: request.data,
                headers: oauth.toHeader(oauth.authorize(request, token))
            }).done(function(body) {
                expect(body).to.have.property('entities');
                expect(body).to.have.property('created_at');
                expect(body).to.have.property('id');
                expect(body).to.have.property('text');
                expect(body.text).to.equal(text);
                expect(body.user).to.be.an('object');
                done();
            });
        });
    });
});