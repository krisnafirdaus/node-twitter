// server.js
const express = require("express");
const passport = require("passport");
const TwitterStrategy = require("passport-twitter").Strategy;
const session = require("express-session"); // Import express-session
const cors = require("cors");
const dotenv = require("dotenv");
const TwitterClient = require("twitter-api-client").TwitterClient;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure express-session middleware
app.use(
  session({
    secret: "krisna",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session()); // Use passport.session() middleware

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: "http://localhost:3001/auth/twitter/callback",
    },
    async (token, tokenSecret, profile, done) => {
      // Create a TwitterClient instance with the user's token and tokenSecret
      const twitterClient = new TwitterClient({
        apiKey: process.env.TWITTER_CONSUMER_KEY,
        apiSecret: process.env.TWITTER_CONSUMER_SECRET,
        accessToken: token,
        accessTokenSecret: tokenSecret,
      });

      // Check if the user follows the NASA account
      let followsNASA = false;
      try {
        const result = await twitterClient.friendships?.show({
          source_screen_name: profile.username,
          target_screen_name: "NASA",
        });
        followsNASA = result.relationship.source.following;
      } catch (error) {
        console.error("Error checking if user follows NASA:", error);
      }

      return done(null, {
        token,
        tokenSecret,
        profile,
        followsNASA,
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.get("/auth/twitter", passport.authenticate("twitter"));

app.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect(
      `http://localhost:3000?token=${req.user.token}&tokenSecret=${req.user.tokenSecret}&followsNASA=${req.user.followsNASA}`
    );
  }
);

if (process.env.VERCEL_ENV) {
  module.exports = app;
} else {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
