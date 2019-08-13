var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Post = require('../models/Post');



router.get('/', function (req, res) {
    Post.find({}).populate('author').sort('-createdAt').exec(function (err, posts) {   // 최신 게시물 기준으로 재정렬
        if(err) return res.json({success: false, message: err});
        res.render('posts/index', {posts:posts, user: req.user});
        // res.json({success: true, data: posts});
    });
}); // index
router.get('/new', isLoggedIn, function (req, res) {
    res.render('posts/new', {user: req.user});
}); // new
router.post('/posts', isLoggedIn, function (req, res) {
    req.body.post.author = req.user._id;
    Post.create(req.body.post, function (err, post) {
        if(err) return res.json({success: false, message: err});
        // res.json({success: true, data: post});
        res.redirect('/posts');
    })
}); // create
router.get('/:id', function (req, res) {
    Post.findById(req.params.id).populate('author').exec(function (err, post) {
        if(err) return res.json({success: false, message: err});
        res.render('posts/show', {post: post, user: req.user});
    })
}); // show
router.get('/:id/edit', isLoggedIn, function (req, res) {
    Post.findById(req.params.id, function (err, post) {
        if(err) return res.json({success: false, message: err});
        if(!req.user._id.equals(post.author)) return res.json({success:false, messgae: 'Unaauthrized Attempt'});
        res.render('posts/edit', {post: post, user: req.user});
    })
}); // edit
router.put('/:id', isLoggedIn, function (req, res) {
    req.body.post.updatedAt=Date.now();
    Post.findOneAndUpdate({_id: req.params.id, author: req.user._id}, req.body.post, function (err, post) {
        if(err) return res.json({success:false, messgae: err});
        if(!post) return res.json({success:false, messgae: 'No data found to update'});
        res.redirect('/posts/'+req.params.id);
    });
}); // update
router.delete('/:id', function (req, res) {

    Post.findOneAndRemove({_id: req.params.id, author: req.user._id}, function (err, post) {
        if(err) return res.json({success:false, messgae: err});
        if(!post) return res.json({success:false, messgae: 'No data found to update'});
        res.redirect('/posts');
    });
}); // delete

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect('/');
}

module.exports = router;
