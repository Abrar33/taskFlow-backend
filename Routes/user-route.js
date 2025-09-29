const express = require("express");
const {
  registerUser,
  loginUser,
    logoutUser,
    getProfile,
    updateProfile,
    forgotPassword,
    resetPassword
} = require("../Controller/user-controller");
// const { protect } = require("../Middleware/auth-middleware");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
// router.get("/profile", protect, getProfile);
// router.put("/profile", protect, updateProfile);
// router.post("/forgot-password", forgotPassword); 
// router.put("/reset-password/:token", resetPassword);
module.exports = router;