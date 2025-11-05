// import User from "../models/User.js";

const express = require("express");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const { User } = require("./../models/user.model.js");
const { CustomError } = require("../utils/custom-error.js");

const authRouter = express.Router();

const client = jwksClient({
  jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

authRouter.post("/microsoft", async (req, res) => {
  console.log("Hello");
  const { idToken } = req.body;

  jwt.verify(
    idToken,
    getKey,
    {
      algorithms: ["RS256"],
      audience: "b30fe25f-d839-4db1-ba00-bec20b82465d", // client id
      issuer:
        "https://login.microsoftonline.com/d6888770-182a-402b-81ae-b695d2c06904/v2.0", // tenant id
    },
    async (err, decoded) => {
      if (err) return res.status(401).json({ error: "Invalid token" });

      // decoded now contains Microsoft user info
      const { name, preferred_username, oid } = decoded;

      let user = await User.findOne({ microsoftId: oid });
      if (!user) {
        user = await User.create({
          name,
          email: preferred_username,
          microsoftId: oid,
        });
      }

      const token = user.generateToken();
      const options = {
        maxAge: 1000 * 60 * 60 * 24, // 1 day in milliseconds
        httpOnly: true, // cannot be accessed via JS
        secure: false,
      };
      res.cookie("token", token, options);

      console.log(token);

      return res.status(200).json({
        status: "success",
        data: user,
        message: "login successful",
      });
    }
  );
});

authRouter.post("/logout", async (req, res) => {
  res.clearCookie("token");
  return res.status(200).json({
    status: "success",
    message: "logout successful",
  });
});

authRouter.post("/protect", async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    console.log("Token: ", token);
    if (!token) {
      return res.status(401).json({
        status: "fail",
        type: "Unauthorized",
        message: "Unauthorized user",
      });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    let user = await User.findOne({ microsoftId: decoded });

    console.log("User: ", user);

    if (!user) {
      return res.status(401).json({
        status: "fail",
        type: "Unauthorized",
        message: "Unauthorized user",
      });
    }

    return res.status(200).json({
      status: "success",
      type: "Authenticated",
      data: user,
      message: "You are authenticated",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { authRouter };
