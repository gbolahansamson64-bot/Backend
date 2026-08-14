const jwt = require("jsonwebtoken");

const generateAdminToken = (res, adminId) => {
  const token = jwt.sign(
    {
      id: adminId,
      role: "admin",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.cookie("adminToken", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
};

module.exports = generateAdminToken;