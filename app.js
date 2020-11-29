const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const mongodb = require("mongodb");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const cors = require("cors");

const session = require("express-session"); // 3 pacakge needed to authenticate and serialize and deserialize users
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const GoogleStrategy = require("passport-google-oauth20").Strategy; // to let user login using google account
const findOrCreate = require("mongoose-findorcreate");
require("dotenv").config(); // to use .env file for protection of user info

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
// ** MIDDLEWARE ** //

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.enable("trust proxy");
app.use(
  session({
    secret: process.env.CLIENT_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
mongoose.connect(
  "mongodb+srv://admin-kippum:family3wkd@cluster0.egq2i.mongodb.net/doghotelDB",
  {
    // to connect straight to atlas instead of local mongodb have to swith to this from 27017.
    // to use atlas first need to set up cluster, and set up user ,(login using termianl), press connect, connect your application, and copy and paster url here.
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
  }
);

// Schemas
const bookingSchema = new mongoose.Schema({
  room: String,
  Date: String,
  Fname: String,
  Lname: String,
  Address1: String,
  Address2: String,
  Payment: String,
  Cardname: String,
  Creditnum: Number,
  Exp: String,
  Cvv: Number,
  Startdate: String,
  Enddate: String,
  numofdays: Number,
  totalprice: Number,
  description: [],
});
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  lname: String,
  fname: String,
  googleId: String, // since our google auth method has findorcreate method uses googleId, googleid attr should be included in userSchema, otherwise it will create new user everytime user logs in
  booking: [bookingSchema],
});

// order schema,plugin,models,use,serialize,deserialize

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate); // to use find or create plug in to user schema
const Booking = new mongoose.model("Booking", bookingSchema); // interface to user mongo db, not the list itself
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy()); // responsible for setting up local strategy of auth

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser()); // instead of this use below when working with google because
// User.serializeUser is a method provided by passport-local-mongoose - which means that it will only work with
// local auth method, so if you want it to be compatible with anyother auth method use code below from passport
passport.serializeUser(function (user, done) {
  // find what these are doing
  done(null, user.id);
}); // when using with passport-local, it will take care of extra code.
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      // to use google auth method
      clientID: process.env.CLIENT_ID, // access ID and SECRET in .env file
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL:
        "https://damp-thicket-92600.herokuapp.com/auth/google/Doghotel", // callback url you wrote on google APIS credential
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo", // do I need this line still?
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log("client id is " + process.env.CLIENT_ID);
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        // not a function provided by mongo but by using "mongoose-findorcreate"  you can actually use findorcreate function
        // if the user with that specific googleId doesn't exist create one, why is it only creating attr for booking, seems like its creating only if its array attr.
        return cb(err, user);
      });
    }
  )
);

// Pages
app.get("/test", function (req, res) {
  if (req.isAuthenticated()) {
    console.log("true");
    res.send(true);
  } else {
    console.log("false");
    res.send(false);
  }
});

app.post("/yourbooking", function (req, res) {
  console.log("received");
  User.findById(req.user._id, function (err, founduser) {
    if (err) {
      res.send("Error occured");
    } else {
      res.json(founduser);
    }
  });
});

app.post("/checkout", function (req, res) {
  const userinfo = req.user;
  const confirminfo = req.body;
  console.log(confirminfo);
  User.findOne({ username: userinfo.username }, function (err, founduser) {
    if (err) {
      res.send("error occured while saving");
    } else {
      res.send("successfully added booking");
      founduser.booking.push(confirminfo);
      founduser.save();
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("https://quirky-lamarr-a016e1.netlify.app/"); // it works only when you redirect to home page but why?
});

app.post("/login", function (req, res, next) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } // error while trying to login
    else {
      passport.authenticate("local", function (err, user, info) {
        // if the local auth method fails it will return 401 error, so to prevent custom error handling methods is needed.
        if (err) {
          return next(err); // will generate a 500 error
        }
        //
        if (!user) {
          return res.send(false);
        }
        req.login(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          return res.send(true);
        });
      })(req, res, next); // what does this do?
    }
  });
});

app.get("/signup", function (req, res) {
  //Signup handling
  User.find({}, function (err, found) {
    res.json(found);
  });
});

app.post("/signup", function (req, res) {
  const userinfo = req.body;
  const new_user = new User({
    // to use passport to authenticate user username and password attr is needed,the object passed in from react also needs username and password attr
    username: userinfo.username, // get userinfo from frontend, and create new user, booking attr is not defined therefore it will be an empty array for now.
    password: userinfo.password,
    lname: userinfo.lname,
    fname: userinfo.fname,
  });
  User.register(new_user, userinfo.password, function (err, user) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.send("successfully inserted");
      });
    }
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
); // using google auth method we set up above, identify the user using profile which includes id and email)
app.get(
  "/auth/google/Doghotel", // unlike using local auth method this method only doesn't follow user schema, it only create google id attr
  passport.authenticate("google", {
    failureRedirect: "https://quirky-lamarr-a016e1.netlify.app/signin",
  }),
  function (req, res) {
    // Successful authentication, redirect home
    res.redirect("https://quirky-lamarr-a016e1.netlify.app/googleauth");
  }
);

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const apiRouter = require("./routes/api");

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/api", apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});
module.exports = app;
