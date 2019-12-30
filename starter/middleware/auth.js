const jwt = require("jsonwebtoken");
const config = require("config");

/* This middleware checks to see if the user is authorized to visit a certain page by checking the token against the user that is trying to access the page*/

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header("x-auth-token");

  //Check if no token
  if (!token) {
    return res.status(401).json({ msg: "No token. Authorization denied" });
  }

  //Verify token
  try {
    const decoded = jwt.verify(token, config.get("jwtSecret"));

    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};
