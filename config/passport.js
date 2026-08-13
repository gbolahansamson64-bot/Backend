const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/User");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL
        },

        async (accessToken, refreshToken, profile, done) => {

            try {

                let user = await User.findOne({
                    googleId: profile.id
                });

                if (user) {
                    return done(null, user);
                }

                user = await User.findOne({
                    email: profile.emails[0].value
                });

                if (user) {

                    user.googleId = profile.id;
                    user.provider = "google";
                    user.avatar = profile.photos[0].value;

                    await user.save();

                    return done(null, user);

                }

                user = await User.create({

                    firstName: profile.name.givenName,

                    lastName: profile.name.familyName,

                    email: profile.emails[0].value,

                    googleId: profile.id,

                    avatar: profile.photos[0].value,

                    provider: "google"

                });

                done(null, user);

            } catch (error) {

                done(error, null);

            }

        }
    )
);