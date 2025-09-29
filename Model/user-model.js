const mongoose=require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false, // Don’t send in query results
    },
    role: {
      type: String,
      enum: ["user", "admin"], 
      default: "user", 
    },
    avatar: {
      type: String, // optional: profile picture
      default: "",
    },
    boards: [
      {
        board: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Board",
        },
        role: {
          type: String,
          enum: ["admin", "member"], // board-level role
          default: "member",
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

//
// 🔒 Password Hash Middleware
//
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//
// ✅ Compare Password Method
//
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

//
// 🔑 Generate JWT Token
//
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);

