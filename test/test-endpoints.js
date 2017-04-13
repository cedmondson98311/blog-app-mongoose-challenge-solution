const { app, runServer, closeServer } = require('../server.js');

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const { BlogPost } = require('../models');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];

    for (let i = 1; i <= 10; i++) {
        seedData.push(generateBlogData());
    }
    // this will return a promise
    return BlogPost.insertMany(seedData);
}

function generateBlogData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.lorem.words(),
        content: faker.lorem.words(),
        created: faker.date.recent()
    }
};

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

function fixAuthorName(post) {
    return `${post.author.firstName} ${post.author.lastName}`.trim();
}

describe('Blog API resource', function() {

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        seedBlogData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    })

    describe('GET endpoint', function() {

        it('should return all existing posts on GET', function() {

            let response;

            return chai.request(app)
                .get('/posts')
                .then(function(_response) {
                    res = _response;
                    res.should.have.status(200);
                    res.body.should.have.length.of.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    res.body.should.have.length.of(count);
                });
        });

        it('should return posts with the correct fields', function() {

            let response;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.a('array');
                    res.body.should.have.length.of.at.least(1);

                    res.body.forEach(function(post) {
                        post.should.be.a('object');
                        post.should.include.keys(
                            'author', 'content', 'title', 'created');
                    });
                    response = res.body[0];
                    return BlogPost.findById(response.id);
                })
                .then(function(post) {

                    response.id.should.equal(post.id);
                    response.author.should.equal(fixAuthorName(post));
                    response.content.should.equal(post.content);
                    response.title.should.equal(post.title);
                    //response.created.should.equal(post.created);
                });
        });
    });

    describe('POST endpoint', function() {

        it('should add a new post', function() {
            const newPost = generateBlogData();

            return chai.request(app)
                .post('/posts')
                .send(newPost)
                .then(function(res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.a('object');
                    res.body.should.include.keys(
                        'id', 'title', 'author', 'content', 'created');
                    res.body.title.should.equal(newPost.title);
                    res.body.author.should.equal(fixAuthorName(newPost));
                    res.body.content.should.equal(newPost.content);
                    return BlogPost.findById(res.body.id);
                })
                .then(function(post) {
                    post.author.lastName.should.equal(newPost.author.lastName);
                    post.author.firstName.should.equal(newPost.author.firstName);
                    post.content.should.equal(newPost.content);
                    post.title.should.equal(newPost.title);
                });
        });
    });

    describe('PUT endpoint', function() {

        it('Should update the post', function() {
            const updateData = {
                title: 'updateTestupdateTest',
                content: 'updatedUpdatedUpdated'
            };

            return BlogPost
                .findOne()
                .exec()
                .then(function(post) {
                    updateData.id = post.id;

                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(function(res) {
                    res.should.have.status(201);

                    return BlogPost.findById(updateData.id).exec();
                })
                .then(function(post) {
                    post.title.should.equal(updateData.title);
                    post.content.should.equal(updateData.content);
                });
        });
    });

    describe('DELETE endpoint', function() {

        it('should delete the post', function() {
            let post;

            return BlogPost
                .findOne()
                .exec()
                .then(function(_post) {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(function(res) {
                    res.should.have.status(204);
                    return BlogPost.findById(post.id).exec()
                })
                .then(function(_post) {
                    should.not.exist(_post);
                });
        });
    });
});
