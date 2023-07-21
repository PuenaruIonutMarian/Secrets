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

app.use(passport.initialize()); // Initialize Passport authentication
app.use(passport.session()); // Enable Passport to use sessions

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
    useNewUrlParser: true
}); // Connect to the MongoDB database

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: [String] // Schema for storing user's secrets as an array of strings
});

userSchema.plugin(passportLocalMongoose); // Simplifies Passport authentication for local strategy
userSchema.plugin(findOrCreate); // Plugin for finding or creating user records

const User = new mongoose.model("User", userSchema); // Create a User model based on the userSchema

passport.use(User.createStrategy()); // Configure Passport to use local strategy for authentication

passport.serializeUser(function(user, done){done(null, user.id);}); // Serialize user for session
passport.deserializeUser(function(id, done) {
    User.findById(id)
        .then(user => {
            done(null, user); // Deserialize user from session
        })
        .catch(err => {
            done(err, null);
        });
});

// Add the GoogleStrategy to passport for OAuth2 Google authentication
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID, // Client ID from the environment variables
        clientSecret: process.env.CLIENT_SECRET, // Client Secret from the environment variables
        callbackURL: 'http://localhost:3000/auth/google/callback', // Callback URL after Google authentication
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo', // URL to fetch user profile
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
        scope: ['profile','email'] // Google scopes requested during authentication
    })
);

// Google callback URL after successful authentication
app.get("/auth/google/callback",
    passport.authenticate('google', {
        failureRedirect: '/login' // Redirect to login page on authentication failure
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

app.get("/secrets", async function (req, res) {
    try {
        // Find users with non-empty secrets array and render the "secrets" template
        const foundUsers = await User.find({ "secret": { $ne: null } });
        if (foundUsers) {
            res.render("secrets", { userWithSecrets: foundUsers }); // Updated variable name here
        }
    } catch (err) {
        console.log(err);
        // Handle the error if necessary
    }
});

// Route for accessing the "submit" page
app.get("/submit", function(req, res){
    if (req.isAuthenticated() || req.user) {
        res.render("submit"); // Render the "submit" template if user is authenticated
    } else {
        res.redirect("/login"); // Redirect to login page if user is not authenticated
    }
});

// Handle form submission for adding a new secret
app.post("/submit", async function (req, res) {
    const submittedSecret = req.body.secret;
    try {
        const foundUser = await User.findOne({ _id: req.user.id });
        if (foundUser) {
            foundUser.secret.push(submittedSecret); // Add the new secret to the array
            await foundUser.save();
            res.redirect("/secrets"); // Redirect to the "secrets" page after saving the secret
        }
    } catch (err) {
        console.log(err);
        // Handle the error if necessary
    }
});

// Handle logout
app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        }
        res.redirect("/"); // Redirect to the home page after logout
    });
});

// Handle user registration
app.post("/register", async function (req, res) {
    User.register({
        username: req.body.username
    }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register"); // Redirect to the registration page on error
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets"); // Redirect to the "secrets" page after successful registration
            });
        }
    });
});

// Handle user login
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
                res.redirect("/secrets"); // Redirect to the "secrets" page after successful login
            });
        }
    })
});

// Start the server and listen on port 3000
app.listen(3000, function () {
    console.log("Server started on port 3000.");
});

