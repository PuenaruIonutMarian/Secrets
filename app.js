//jshint esversion:6
require('dotenv').config(); // Load environment variables from .env file
const express = require("express"); // Import the Express framework
const bodyParser = require("body-parser"); // Middleware for parsing request bodies
const ejs = require("ejs"); // Templating engine for rendering dynamic content
const mongoose = require("mongoose"); // MongoDB object modeling tool
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express(); // Create an Express application

app.use(express.static("public")); // Serve static files from the "public" directory
app.set('view engine', 'ejs'); // Set EJS as the view engine for rendering templates
app.use(bodyParser.urlencoded({
    extended: true
})); // Enable URL-encoded body parsing

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
    useNewUrlParser: true
}); // Connect to the MongoDB database


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema); // Create a User model based on the userSchema

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){done(null, user.id);});
passport.deserializeUser(function(id, done) {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});

// Add the GoogleStrategy to passport
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: 'http://localhost:3000/auth/google/callback',
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    function (accessToken, refreshToken, profile, cb) {
        // Use the Google ID as the identifier for the user
        console.log(profile);

        // Find or create the user with the given Google ID
        User.findOrCreate({ username: profile.emails[0].value, googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



// Home route handler
app.get("/", function (req, res) {
    res.render("home"); // Render the "home" template
});
// Redirect to Google for authentication
app.get("/auth/google",
    passport.authenticate('google', {
        scope: ['profile','email']
    })
);

// Google callback URL after successful authentication
app.get("/auth/google/callback",
    passport.authenticate('google', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect to secrets page
        res.redirect('/secrets');
    }
);

// Login page route handler
app.get("/login", function (req, res) {
    res.render("login"); // Render the "login" template
});

// Register page route handler
app.get("/register", function (req, res) {
    res.render("register"); // Render the "register" template
});


app.get("/secrets", function (req, res) {
    if (req.isAuthenticated() || req.user) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});


app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});




app.post("/register", async function (req, res) {
    User.register({
        username: req.body.username
    }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    })
});


app.listen(3000, function () {
    console.log("Server started on port 3000."); // Start the server and listen on port 3000
});
