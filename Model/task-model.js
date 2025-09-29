
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    listId: {
      type: mongoose.Schema.Types.ObjectId, // no ref, since it's an embedded schema
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    deadline: { type: Date },
    attachment: { type: String },
    position: { type: Number, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: [
      {
         type: mongoose.Schema.Types.ObjectId,
        ref: "User"}],
     completed: {
   type: Boolean,
   default: false, // Tasks should be uncompleted by default
  },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
