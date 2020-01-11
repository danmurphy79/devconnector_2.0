const express = require("express");
const router = express.Router();
const request = require("request");
const config = require("config");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
// Add this as a second parameter in the router.get function and it will created a private route vvvvvvvvv
const auth = require("../../middleware/auth");

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET THE CURRENT USER'S PROFILE //////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

// @route     GET api/profile/me
// @desc      Get current user's profile
// @access    Private bc we are getting ID from the token

router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id
    }).populate(`user`, [`name`, `avatar`]);

    // check to see if there's no profile
    if (!profile) {
      return res.status(400).json({ msg: "No profile for this user" });
    }
    // Otherwise, return the profile
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// CREATE || UPDATE USER PROFILE //////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////

// @route     POST api/profile
// @desc      Create or Update a user profile
// @access    Private bc we are getting ID from the token

router.post(
  "/",
  [
    auth,
    [
      check("status", "Status is required")
        .not()
        .isEmpty(),
      check("skills", "Skills are required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin
    } = req.body;

    // Build Profile Object //////////////////////////////////////////////////////////////
    const profileFields = {};
    profileFields.user = req.user.id;
    // if the field exists on the post request, set the property of the profile object to that value
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    // set skills to an array from the strings, and ensure that space after commas does not matter
    if (skills) {
      profileFields.skills = skills.split(",").map(skill => skill.trim());
    }

    // Build social object //////////////////////////////////////////////////////////////////
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (instagram) profileFields.social.instagram = instagram;

    try {
      // Check to see if there is a profile in the database
      let profile = await Profile.findOne({ user: req.user.id });
      // If the profile is found
      if (profile) {
        //Update the profile with the profileFields object
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );
        // Return the profile as a JSON object
        return res.json(profile);
      }

      // If the profile is not found
      // Create a profile with the profileFields object
      profile = new Profile(profileFields);

      // Save the profile to the db
      await profile.save();

      // Return the profile as a json object
      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

//////////////////////////////////////////////////////////////////////////////////////////////
// GET ALL PROFILES //////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

// @route     GET api/profile
// @desc      Get all profiles
// @access    Public

router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find().populate("user", ["name", "avatar"]);
    // populate() creates a user property on the profile object that gets the name and avatar from the profile object
    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

///////////////////////////////////////////////////////////////////////////////////////////////
// GET PROFILE FOR A PARTICULAR USER //////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

// @route     GET api/profile/user/:user_id
// @desc      Get profile by user ID
// @access    Public

router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id
    }).populate("user", ["name", "avatar"]); // Creates a new property called "user" on the profile object and populates it with the "name" and "avatar" values from the user in the db

    if (!profile) return res.status(400).json({ msg: "Profile not found" });
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind == "ObjectId") {
      return res.status(400).json({ msg: "Profile not found" });
    }
    res.status(500).send("Server Error");
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// DELETE PROFILE, USER, POSTS //////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////

// @route     DELETE api/profile
// @desc      Delete profile, user and posts
// @access    Private

router.delete("/", auth, async (req, res) => {
  try {
    // TODO - remove user's posts
    await Profile.findOneAndRemove({ user: req.user.id }); // Removes profile
    await User.findOneAndRemove({ _id: req.user.id }); // Removes user
    res.json({ msg: "User removed" }); // Returns a confirmation message
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// ADD PROFILE EXPERIENCE //////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

// @route     PUT api/profile/experience
// @desc      Add profile experience
// @access    Private
router.put(
  "/experience",
  [
    auth,
    [
      check("title", "Title is required").notEmpty(),
      check("company", "Company is required").notEmpty(),
      check("from", "From Date is required").notEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    } = req.body;

    const newExperience = {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    };
    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(newExperience);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

////////////////////////////////////////////////////////////
// DELETE PROFILE EXPERIENCE ///////////////////////////////
////////////////////////////////////////////////////////////

/* ________________________________________________________
|                                                          |
|   @route     DELETE api/profile/experience/:exp_id       |
|   @desc      Delete experience from profile              |
|   @access    Private                                     |
| _________________________________________________________|
*/

router.delete("/experience/:exp_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    // Get the remove index
    const removeIndex = profile.experience
      .map(item => item.id)
      .indexOf(req.params.exp_id);

    profile.experience.splice(removeIndex, 1);

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// ADD PROFILE EDUCATION //////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

/* ____________________________________________
|                                              |
|   @route     PUT api/profile/education       |
|   @desc      Add profile education           |
|   @access    Private                         |
| _____________________________________________|
*/

router.put(
  "/education",
  [
    auth,
    [
      check("school", "School is required").notEmpty(),
      check("degree", "Degree is required").notEmpty(),
      check("from", "From Date is required").notEmpty(),
      check("fieldofstudy", "Field of Study is required").notEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    } = req.body;

    const newEducation = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    };
    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(newEducation);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

////////////////////////////////////////////////////////////////
// DELETE PROFILE EDUCATION ////////////////////////////////////
////////////////////////////////////////////////////////////////
/* ________________________________________________________
|                                                          |
|   @route     DELETE api/profile/education/:edu_id        |
|   @desc      Delete education from profile               |
|   @access    Private                                     |
| _________________________________________________________|
*/
////////////////////////////////////////////////////////////////

router.delete("/education/:edu_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    // Get the remove index
    const removeIndex = profile.education
      .map(item => item.id)
      .indexOf(req.params.edu_id);

    profile.education.splice(removeIndex, 1);

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET USER'S GITHUB REPOS //////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
// @route     GET api/profile/github/:username
// @desc      Get User's Github Repos
// @access    Public

router.get("/github/:username", async (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        "githubClientId"
      )}&client_secret=${config.get("githubSecret")}`,
      method: "GET",
      headers: { "user-agent": "node.js" }
    };

    request(options, (error, response, body) => {
      if (error) console.error(error);

      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: `No github profile found` });
      }
      res.json(JSON.parse(body));
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).sendStatus("Server Error");
  }
});

module.exports = router;

/* NEW CONCEPTS ///////////////////////
router.populate()
*/
