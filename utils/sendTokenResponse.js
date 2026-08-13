const generateToken = require("./generateToken");
const cookieOptions = require("./cookieOptions");

const sendTokenResponse = (user, statusCode, message, res) => {

    const token = generateToken(user._id);

    res.cookie("token", token, {

        ...cookieOptions,

        maxAge: 7 * 24 * 60 * 60 * 1000

    });

    res.status(statusCode).json({

        success: true,

        message,

        user: {

            _id: user._id,

            firstName: user.firstName,

            lastName: user.lastName,

            email: user.email,

            role: user.role

        }

    });

};

module.exports = sendTokenResponse;