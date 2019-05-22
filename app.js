var express = require('express');
var path = require('path');
var app = express();
var mongoose = require('mongoose');

mongoose.connect('mongodb+srv://board-app-mfymt.mongodb.net/test" --username test');
var db = mongoose.connection;
db.once('open', function () {
    console.log('DB connected!');
});
db.on('error',function (err) {
    console.log('DB ERROR :', err)
})

app.set("view engine", 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

var data={count: 0};
app.get('/',function (req, res) {
    data.count++;
    res.render('my_first_ejs', data);
});

app.get('/reset', function (req, res) {
    data.count = 0;
    res.render('my_first_ejs', data);
});

app.get('/set/count', function (req, res) {
    if(req.query.count) data.count=req.query.count; // http://localhost:3000/set/count?count=221
    res.render('my_first_ejs', data);
});

app.get('/set/:num', function (req, res) {
    data.count = req.params.num;    // http://localhost:3000/set/309
    res.render('my_first_ejs', data);
});

app.listen(3000, function () {
    console.log('Server on!')
});