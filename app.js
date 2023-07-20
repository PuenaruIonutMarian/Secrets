//jshint esversion:6
require('dotenv').config(); // Load environment variables from .env file
const express = require("express"); // Import the Express framework
const bodyParser = require("body-parser"); // Middleware for parsing request bodies
const ejs = require("ejs"); // Templating engine for rendering dynamic content
const mongoose = require("mongoose"); // MongoDB object modeling tool
// const encrypt = require("mongoose-encryption"); // Encryption plugin for Mongoose
// const md5 = require("md5"); // Hashing algorithm for password hashing
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");

const app = express(); // Create an Express application

app.use(express.static("public")); // Serve static files from the "public" directory
app.set('view engine', 'ejs'); // Set EJS as the view engine for rendering templates
app.use(bodyParser.urlencoded({extended:true})); // Enable URL-encoded body parsing

app.use(session({
    secret:"Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true}); // Connect to the MongoDB database


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// This will encrypt only the password field with the use of a secret, which is basically a long string. For the version with mongoose-encryption.
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

//this is what we use to hash and salt passwords and save the users in mongodb
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema); // Create a User model based on the userSchema
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// Home route handler
app.get("/", function (req, res){
    res.render("home"); // Render the "home" template
});

// Login page route handler
app.get("/login", function (req, res){
    res.render("login"); // Render the "login" template
});

app.get("/secrets", function(req, res){
    if (req.isAuthenticated()){
    res.render("secrets");
}else{
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

// Register page route handler
app.get("/register", function (req, res){
    res.render("register"); // Render the "register" template
});



app.post("/register", async function(req, res) {
User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        });
    }
});
});

app.post("/login", function(req, res){
const user = new User({
username:req.body.username,
password:req.body.password
});
req.login(user, function(err){
    if(err){
        console.log(err);
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
        });
    }
})
});


// Login form submission route handler for the hashing version
// app.post("/login", async function (req, res) {
//   try {
//     const username = req.body.username;
//     const password = req.body.password;
//     const foundUser = await User.findOne({ email: username }).exec(); // Find a user with the provided username
//     if (foundUser) {
//       bcrypt.compare(password, foundUser.password, function (err, result) {
//         if (result === true) {
//           res.render("secrets"); // Render the "secrets" template if the passwords match
//         } else {
//           res.send("Invalid password"); // Send an error message if the passwords don't match
//         }
//       });
//     } else {
//       res.send("User not found"); // Send an error message if the user is not found
//     }
//   } catch (err) {
//     console.log(err);
//     res.send("An error occurred during login."); // Send an error message if an error occurs
//   }
// });


// Register form submission route handler for the hashing version
// app.post("/register", async function (req, res) {
//   const { username, password } = req.body;

//   try {
//     const existingUser = await User.findOne({ email: username }).exec(); // Check if the user already exists
//     if (existingUser) {
//       res.send("User already exists."); // Send an error message if the user already exists
//     } else {
//       bcrypt.hash(password, saltRounds, async function (err, hash) {
//         if (err) {
//           console.log(err);
//           res.send("An error occurred during registration.");
//         } else {
//           const newUser = new User({
//             email: username,
//             password: hash, // Store the hashed password in the database
//           });
//           await newUser.save(); // Save the new user to the database
//           res.render("secrets"); // Render the "secrets" template after successful registration
//         }
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.send("An error occurred during registration."); // Send an error message if an error occurs
//   }
// });


app.listen(3000, function(){
    console.log("Server started on port 3000."); // Start the server and listen on port 3000
});
