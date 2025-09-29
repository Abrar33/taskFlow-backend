const mongoose = require("mongoose");

const ListSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const boardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["admin", "member"], default: "member" },
         invitationAccepted: { type: Boolean, default: false },
      },
    ],
    lists: [ListSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);