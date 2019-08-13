// import modules
var express = require('express');
var path = require('path');
var app = express();
var mongoose = require('mongoose');

var passport = require('passport');
var session = require('express-session');
var flash = require('connect-flash');
var async = require('async');

var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var bcrypt = require('bcrypt-nodejs');

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
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true},
    createdAt: {type: Date, default: Date.now},
    updatedAt: Date
});
var Post = mongoose.model('post', postSchema);

var userSchema = mongoose.Schema({
    email: {type: String, required: true, unique: true},
    nickname: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
});
userSchema.pre('save', function (next) {
   var user = this;
   if(!user.isModified('password')){
       return next();
   } else{
       user.password = bcrypt.hashSync(user.password);
       return next();
   }
});
userSchema.methods.authenticate = function (password) {
    var user = this;
    return bcrypt.compareSync(password, user.password);
};
userSchema.methods.hash = function (password) {
    return bcrypt.hashSync(password);
};

var User = mongoose.model('user', userSchema);


// view setting
app.set('view engine', 'ejs');

// set middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(flash());

app.use(session({secret: 'MySecret'}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user.id);    // 이때 id는 username이 아니라 db의 id이다.


});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

var LocalStrategy = require('passport-local').Strategy;
passport.use('local-login',
    new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true,
        },
        function (req, email, password, done) {
            User.findOne({'email' : email}, function (err, user) {
                if(err) return done(err);

                if(!user){
                    req.flash('email', req.body.email);
                    return done(null, false, req.flash('loginError', 'No user found'));
                }
                if(!user.authenticate(password)){
                    req.flash('email', req.body.email);
                    return done(null, false, req.flash('loginError', 'Password does not Match.'));
                }
                return done(null, user);
            })
        }

    )
)
// 미들웨어(middleware)란?
//
// 서버에 도착한 신호는 router를 통해서 어떤 response를 할지 결정이 되는데,
// router를 통하기 전에(서버도착 - router 중간에) 모든 신호들에게 수행되는 명령어를 미들웨어(middleware)라고 한다.
// app.use()를 통해 수행될 수 있으며,
// 당연히 router보다 위에 위치해야 한다.


// set routes
// app.get('/posts', function (req, res) {
//     Post.find({}, function (err, posts) {
//         if(err) return res.json({success: false, message: err});
//         res.render('posts/index', {data:posts})
//     });
// });


// set home routes
app.get('/', function (req, res) {
    res.redirect('/posts');
});

app.get('/login', function (req, res) {
    res.render('login/login', {
        email:req.flash('email')[0],
        loginError:req.flash('loginError')
    })
});

app.post('/login',function (req, res, next) {
        req.flash('email'); // flash email data
        if(req.body.email.length === 0 || req.body.password.length === 0){
            req.flash('email', req.body.email);
            req.flash('loginError', 'Please enter both email and password.');
            res.redirect('/login');
        }else{
            next();
        }
    }, passport.authenticate('local-login', {
        successRedirect: '/posts',
        failureRedirect: '/login',
        failureFlash: true,
    })
);

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/')
});

// set user routes
app.get('/users/new', function (req, res) {
    res.render('users/new', {
            formData: req.flash('formData')[0],
            emailError: req.flash('emailError')[0],
            nicknameError: req.flash('nicknameError')[0],
            passwordError: req.flash('passwordError')[0]
        }
    );
}); // new

app.post('/users', checkUserRegValidation, function (req, res, next) {
    User.create(req.body.user, function (err, user) {
        if(err) return res.json({
            success: false,
            message: err
        });
        res.redirect('/login');
    });
}); // create

app.get('/users/:id', isLoggedIn, function (req, res) {
    User.findById(req.params.id, function (err, user) {
        if(err) return res.json({
            success: false,
            message: err
        });
        res.render('users/show', {user: user});
    });
}); // show

app.get('/users/:id/edit', isLoggedIn, function (req, res) {
    if(req.user._id != req.params.id) return res.json({success: false, message: 'Unauthrized Attempt'});
    User.findById(req.params.id, function (err, user) {
        if(err) return res.json({
            success: false,
            message: err
        });
        res.render('users/edit', {
            user: user,
            formData: req.flash('formData')[0],
            emailError: req.flash('emailError')[0],
            nicknameError: req.flash('nicknameError')[0],
            passwordError: req.flash('passwordError')[0]
        });
    })

}); // edit

app.put('/users/:id', isLoggedIn, checkUserRegValidation, function (req, res) {
    if(req.user._id != req.params.id) return res.json({success: false, message: 'Unauthrized Attempt'});
    User.findById(req.params.id, req.body.user, function (err, user) {
        if(err) return res.json({success: false, message: err});
        if(user.authenticate(req.body.user.password)){

            if(req.body.user.newPassword){
                req.body.user.password = user.hash(req.body.user.newPassword);
            }else{
                delete req.body.user.password;
            }
            User.findByIdAndUpdate(req.params.id, req.body.user, function (err, user) {
                if(err) return res.json({success: false, message: err});
                res.redirect('/users/'+req.params.id);
            });
        } else {
            req.flash('formData', req.body.user);
            req.flash('passwordError', '- Invalid password');
            req.redirect('/users/'+req.params.id+"edit");
        }
    });
}); // update


//function
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect('/');
}
function checkUserRegValidation(req, res, next){
    var isValid = true;

    async.waterfall(
        [function (callback) {
            User.findOne({email: req.body.user.email, id: {$ne: mongoose.Types.ObjectId(req.params.id)}},
                function (err, user) {
                    if(user){
                        isValid = false;
                        req.flash('emailError','- This email is already registered.');
                    }
                    callback(null, isValid);
                }
            );
        }, function (isValid, callback) {
            User.findOne({nickname: req.body.user.nickname, _id: {$ne: mongoose.Types.ObjectId(req.params.id)}},
                function (err, user) {
                    if(user){
                        isValid=false;
                        req.flash('nicknameError', '- This nickname is already registered.');
                    }
                    callback(null, isValid);
                }
            );
        }], function (err, isValid) {
            if(err) return res.json({success:'false', message:err});
            if(isValid){
                return next();
            }else {
                req.flash('formData', req.body.user);
                res.redirect('back');
            }
        }
    )
}


// set posts routes
app.get('/posts', function (req, res) {
    Post.find({}).populate('author').sort('-createdAt').exec(function (err, posts) {   // 최신 게시물 기준으로 재정렬
        if(err) return res.json({success: false, message: err});
        res.render('posts/index', {data:posts, user: req.user});
        // res.json({success: true, data: posts});
    });
}); // index
app.get('/posts/new', isLoggedIn, function (req, res) {
   res.render('posts/new', {user: req.user});
}); // new
app.post('/posts', isLoggedIn, function (req, res) {
    req.body.post.author = req.user._id;
   Post.create(req.body.post, function (err, post) {
       if(err) return res.json({success: false, message: err});
       // res.json({success: true, data: post});
       res.redirect('/posts');
   })
}); // create
app.get('/posts/:id', function (req, res) {
    Post.findById(req.params.id).populate('author').exec(function (err, post) {
        if(err) return res.json({success: false, message: err});
        res.render('posts/show', {data: post, user: req.user});
    })
}); // show
app.get('/posts/:id/edit', isLoggedIn, function (req, res) {
    Post.findById(req.params.id, function (err, post) {
        if(err) return res.json({success: false, message: err});
        if(!req.user._id.equals(post.author)) return res.json({success:false, messgae: 'Unaauthrized Attempt'});
        res.render('posts/edit', {data: post, user: req.user});
    })
}); // edit
app.put('/posts/:id', isLoggedIn, function (req, res) {
    req.body.post.updatedAt=Date.now();
    Post.findById(req.params.id, function (err, post) {
        if(err) return res.json({success:false, messgae: err});
        if(!req.user._id.equals(post.author)) return res.json({success:false, messgae: 'Unaauthrized Attempt'});
        Post.findByIdAndUpdate(req.params.id, req.body.post, function (err, posts) {
            if(err) return res.json({success: false, message: err});
            // res.json({success: true, message: posts._id+" updated"});
            res.redirect('/posts/'+req.params.id)
        })
    });
}); // update
app.delete('/posts/:id', function (req, res) {
    Post.findById(req.params.id, function (err, post) {
        if(err) return res.json({success:false, messgae: err});
        if(!req.user._id.equals(post.author)) return res.json({success:false, messgae: 'Unaauthrized Attempt'});
        Post.findByIdAndRemove(req.params.id, function (err, posts) {
            if(err) return res.json({success: false, message: err});
            // res.json({success: true, message: posts._id+" deleted"});
            res.redirect('/posts');
        })
    });
}); // delete



app.listen(3000, function () {
    console.log('Server on!')
});