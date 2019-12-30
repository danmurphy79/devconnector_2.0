const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const config = require("config");
// New to me vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
// New to me ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

const User = require("../../models/User");

// @route     POST api/users
// @desc      Register User
// @access    Public
router.post(
  "/",
  [
    check("name", "Name is required")
      .not()
      .isEmpty(),
    check("email", "Not a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with at least 6 characters"
    ).isLength({
      min: 6
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // See if the user exists /////////////////////////////////////////////////////////
      let user = await User.findOne({ email });

      if (user) {
        // If so, send back an error
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }
      ///////////////////////////////////////////////////////////////////////////

      // Get user's gravatar //////////////////////////////////////////////
      const avatar = gravatar.url(email, {
        //size
        s: "200",
        //rating
        r: "pg",
        //default
        d: "mm"
      });
      //////////////////////////////////////////////////////////////////////

      // Create a new user with the provided credentials ///////////////////
      user = new User({
        name,
        email,
        avatar,
        password
      });
      //////////////////////////////////////////////////////////////////////

      // Encrypt password //////////////////////////////////////////////////
      // Generate a salt
      const salt = await bcrypt.genSalt(10);

      // Add the salt to the password and hash it. Yum.
      user.password = await bcrypt.hash(password, salt);
      //////////////////////////////////////////////////////////////////////

      // Save the user to the database /////////////////////////////////////
      await user.save();
      ///////////////////////////////////////////////////////////////////////

      // Return jsonwebtoken ///////////////////////////////////////////////
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
    ///////////////////////////////////////////////////////////////////////
  }
);

module.exports = router;
