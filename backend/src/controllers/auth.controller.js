import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      // Return full user (minus password)
      const savedUser = await User.findById(newUser._id).select("-password");
      res.status(201).json(savedUser);
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in. Please use the Google button." });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    // Return full user (minus password)
    const fullUser = await User.findById(user._id).select("-password");
    res.status(200).json(fullUser);
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const googleAuth = async (req, res) => {
  const { idToken } = req.body;
  try {
    if (!idToken) {
      return res.status(400).json({ message: "Google ID token is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        if (picture && !user.profilePic) {
          user.profilePic = picture;
        }
        await user.save();
      }
    } else {
      user = new User({
        fullName: name,
        email,
        googleId,
        authProvider: "google",
        profilePic: picture || "",
      });
      await user.save();
    }

    generateToken(user._id, res);

    // Return full user (minus password)
    const fullUser = await User.findById(user._id).select("-password");
    res.status(200).json(fullUser);
  } catch (error) {
    console.log("Error in googleAuth controller:", error.message);
    res.status(500).json({ message: "Google authentication failed" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, fullName } = req.body;
    const userId = req.user._id;

    const update = {};

    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      update.profilePic = uploadResponse.secure_url;
    }

    if (fullName && fullName.trim().length > 0) {
      update.fullName = fullName.trim();
    }

    // Developer profile fields
    const { bio, title, skills, techStack, github, portfolio, experience } = req.body;
    if (typeof bio === "string") update.bio = bio;
    if (typeof title === "string") update.title = title.trim();
    if (Array.isArray(skills)) update.skills = skills.map((s) => s.trim()).filter(Boolean);
    if (Array.isArray(techStack)) update.techStack = techStack.map((s) => s.trim()).filter(Boolean);
    if (typeof github === "string") update.github = github.trim();
    if (typeof portfolio === "string") update.portfolio = portfolio.trim();
    if (typeof experience === "string") update.experience = experience;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { showLastSeen, preferredLanguage } = req.body;

    const update = {};
    if (typeof showLastSeen === "boolean") update.showLastSeen = showLastSeen;
    if (typeof preferredLanguage === "string") update.preferredLanguage = preferredLanguage;

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");

    res.status(200).json(user);
  } catch (error) {
    console.log("Error in updatePrivacySettings:", error.message);
    res.status(500).json({ message: "Failed to update privacy settings" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
