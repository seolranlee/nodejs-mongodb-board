// import modules
var express = require('express');
var path = require('path');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

// connect database
mongoose.connect(process.env.MONGO_DB);
var db = mongoose.connection;
db.once('open', function () {
    console.log('DB connected!');
});
db.on('error',function (err) {
    console.log('DB ERROR :', err)
});

// model setting
var postSchema = mongoose.Schema({
    title: {type: String, required: true},
    body: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
    updatedAt: Date
});
var Post = mongoose.model('post', postSchema);

// view setting
app.set('view engine', 'ejs');

// set middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// 미들웨어(middleware)란?
//
// 서버에 도착한 신호는 router를 통해서 어떤 response를 할지 결정이 되는데,
// router를 통하기 전에(서버도착 - router 중간에) 모든 신호들에게 수행되는 명령어를 미들웨어(middleware)라고 합니다.
// app.use()를 통해 수행될 수 있으며,
// 당연히 router보다 위에 위치해야 합니다.


// set routes
// app.get('/posts', function (req, res) {
//     Post.find({}, function (err, posts) {
//         if(err) return res.json({success: false, message: err});
//         res.render('posts/index', {data:posts})
//     });
// });

app.get('/posts', function (req, res) {
    Post.find({}).sort('-createdAt').exec(function (err, posts) {   // 최신 게시물 기준으로 재정렬
        if(err) return res.json({success: false, message: err});
        res.render('posts/index', {data:posts})
    });
}); // index

app.post('/posts', function (req, res) {
   Post.create(req.body.post, function (err, post) {
       if(err) return res.json({success: false, message: err});
       res.json({success: true, data: post});
   })
}); // create
app.get('/posts/:id', function (req, res) {
    Post.findById(req.params.id, function (err, post) {
        if(err) return res.json({success: false, message: err});
        res.render('posts/show', {data: post});
    })
}); // show
app.put('/posts/:id', function (req, res) {
    req.body.post.updatedAt=Date.now();
    Post.findByIdAndUpdate(req.params.id, req.body.post, function (err, posts) {
        if(err) return res.json({success: false, message: err});
        res.json({success: true, message: posts._id+" updated"});
    })
}); // update
app.delete('/posts/:id', function (req, res) {
    Post.findByIdAndRemove(req.params.id, function (err, posts) {
        if(err) return res.json({success: false, message: err});
        res.json({success: true, message: posts._id+" deleted"});
    })
}); // delete



app.listen(3000, function () {
    console.log('Server on!')
});