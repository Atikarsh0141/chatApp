import express from "express";
import { checkAuth, googleAuth, login, logout, signup, updateProfile, updatePrivacySettings } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/privacy-settings", protectRoute, updatePrivacySettings);

router.get("/check", protectRoute, checkAuth);

export default router;
