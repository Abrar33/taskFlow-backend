const jwt = require("jsonwebtoken");
const User = require("../Model/user-model"); // Corrected path to the user model

// ✅ Verify JWT & attach user to req
const protect = async (req, res, next) => {
  let token;

  // 1) Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // 2) Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3) Attach user to req (excluding password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// ✅ Restrict access to specific roles (e.g., admin)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: `User role '${req.user.role}' not authorized` });
    }
    next();
  };
};

module.exports = { protect, authorize };
