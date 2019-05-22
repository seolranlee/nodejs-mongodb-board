var express = require('express');
var path = require('path');
var app = express();

// app.use(express.static(__dirname + '/public'));
// console.log(__dirname); // __dirname 은 node 에서 제공하는 node 파일의 경로를 담고 있는 변수이다.

app.use(express.static(path.join(__dirname, 'public')));

// 실행결과도 같은데 왜 코드를 더 입력해서 이렇게 하냐면, path를 쓰면
//
// path.join('a', 'b')
//
// path.join('a/', '/b')
//
// path.join('a', '/b')
//
// path.join('a/', 'b') 등등..
//
// /에 상관없이 주소조합을 알아서 해줍니다.

app.get('/', function (req, res) {
    res.send('Hello world!');
});

app.listen(3000, function () {
    console.log('Server on!')
});