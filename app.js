//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


//This will encrypt only you password field with the use of secret const wich is bassically a long string. 
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);



app.get("/", function (req, res){
    res.render("home");
});

app.get("/login", function (req, res){
    res.render("login");
});

app.post("/login", async function (req, res) {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const foundUser = await User.findOne({ email: username }).exec();
        if (foundUser && foundUser.password === password) {
            res.render("secrets");
        }
    } catch (err) {
        console.log(err);
    }
});

app.get("/register", function (req, res){
    res.render("register");
});

app.post("/register", async function (req, res) {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ email: username }).exec();
        if (existingUser) {
            res.send("User already exists.");
        } else {
            const newUser = new User({
                email: username,
                password: password
            });
            await newUser.save();
            res.render("secrets");
        }
    } catch (err) {
        console.log(err);
        res.send("An error occurred during registration.");
    }
});






app.listen(3000, function(){console.log("Server started on port 3000.");});