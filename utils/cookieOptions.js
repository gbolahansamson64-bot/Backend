const cookieOptions = {

    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "none"

};

module.exports = cookieOptions;

