const mongoose = require("mongoose");
// const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  microsoftId: String,
});

userSchema.methods.generateToken = function () {
  return jwt.sign({ _id: this.microsoftId }, process.env.TOKEN_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRY,
  });
};

const User = mongoose.model("User", userSchema);

module.exports = { User };
