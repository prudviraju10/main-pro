require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var nodemailer = require('nodemailer');

mongoose.connect(process.env.DB_URL, {useNewUrlParser:true, useUnifiedTopology:true, useFindAndModify: false});

const app = express();

var store = new MongoDBStore({
    uri: process.env.DB_URL,
    collection: 'mySessions',
    connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
  });

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: store,
    cookie: {
        maxAge: 15 * 24 * 60 * 60 * 1000
      }
  }));

const authmiddleware = (req, res, next) => {
    if(req.session.isAuth){
        next();
    }
    else{
        res.redirect("/");
    }
}

const credentialSchema = new mongoose.Schema({
    name : String,
    email : String,
    password: String,
    reset : Boolean
});

const Credential = mongoose.model("Credential", credentialSchema);




app.get("/", function(req,res){
    req.session.isAuthfrrstpswd = true;
    if(req.session.isAuth){
        return res.redirect("/home");
    }
    res.render("login");
});

app.post("/", function(req, res){
    // console.log(req.body);
    Credential.findOne({email : req.body.user_mail},  function(err,result){
        // console.log(result);
        if(!result){
            res.send("<h1>email is not registered</h1>");
            res.end();
        }
        else{
            bcrypt.compare(req.body.user_password, result.password, function(err, re){
            // console.log(res);
            if(re){
                req.session.isAuth = true;
                console.log(req.session);
                res.redirect("/home");
            }
            else{
                res.send("<h1>Invalid Credentials</h1>")
            }
        });
    }
        // console.log("done");
    });

});

app.get("/register", function(req,res){
    res.render("register");
});

app.post("/register", function(req,res){
    // console.log(req.body);
    var hashed_password = bcrypt.hashSync(req.body.user_password, 8);
    console.log(hashed_password);
    const credential = new Credential({name: req.body.user_name, email: req.body.user_mail, password: hashed_password, reset: false });
    credential.save();
    res.redirect("/");
});

app.get("/home", authmiddleware, function(req,res){
    res.render("home");
});

app.post("/logout", function(req,res){
    req.session.destroy((err) => {
        res.redirect("/");
    })
});

app.get("/resetlinkroute", function(req, res){
    if(req.session.isAuthfrrstpswd){
        req.session.count = 0
        req.session.isAuthfrrstpswd = false;
        res.render("resetlink");
    }
    else{
        // res.send("<h1>You can only come here by clicking forgot password in login page🤣</h1>");
        res.redirect("/");
    }
});

app.post("/resetlinkroute", function(req, res){
    // console.log(req.body);
    Credential.findOne({email : req.body.user_mail},  function(err,result){
        if(!result){
            res.send("<h1>You're not registered</h1>");
        }
        else{
            res.send("<h1>Check your mail</h1>");
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                // host: 'smtp.gmail.com',
                // port: 587,
                // secure: false,
                // requireTLS: true,
                auth: {
                  user: process.env.USER_MAIL,
                  pass: USER_MAIL_PASSWORD
                }
              });
            
              var mailOptions = {
                from: process.env.USER_MAIL,
                to: req.body.user_mail,
                subject: 'No-reply',
                html: '<h1><a href= "http://localhost:3000/resetpswd">your link</a>Welcome</h1><p>That was easy!</p>'
              }

              Credential.findOneAndUpdate({email: req.body.user_mail},{ $set: {reset: true}},{new: true} , (err, doc) => {
                if(err){
                    console.log("something went wrong");
                }
                else{
                    console.log(doc);
                }
            });
       
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
        }
    });
});

app.get("/resetpswd", function(req,res){
    if(!req.session.count){
        req.session.count = 0
    }
    req.session.count += 1;
    if(req.session.count === 1){
        res.render("resetpassword");
    }
    else{
            res.send("<h1>Link expeired</h1>");
    }
});

app.post("/resetpswd", function(req, res){
    Credential.findOne({email : req.body.user_mail},  function(err,result){
        if(!result){
            res.send("<h1>Give correct mail</h1>");
        }
        else if(result.reset){
            console.log(req.body);
            var hashed_password = bcrypt.hashSync(req.body.new_pswd, 8);
            Credential.findOneAndUpdate({email: req.body.user_mail},{ $set: {password: hashed_password, reset:false}},{new: true} , (err, doc) => {
                if(err){
                    console.log("something went wrong");
                }
                else{
                    console.log(doc);
                }
            });
            res.send("<h1>Password Updated</h1>");
        }
        else{
            res.send("<h1>You've already reset the password,, if forgot goto login page and click forgot password /h1>")
        }
    });

    
})

app.listen(3000, function(){
    console.log("server started successfully🤩");
})

