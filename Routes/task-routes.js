const express = require("express");
const router = express.Router();
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} = require("../Controller/task-controller");
const { protect } = require("../middleware/authMiddleware");
const { requireBoardRole } = require('../middleware/boardMiddleware'); // Assuming this middleware exists
router.post("/:id/tasks", protect, requireBoardRole(["admin", "member"]), createTask);
router.get("/:id/tasks", protect, requireBoardRole(["admin", "member"]), getTasks);


router.patch("/:id/tasks/:taskId", protect, requireBoardRole(["admin", "member"]), updateTask);


router.delete("/:id/tasks/:taskId", protect, requireBoardRole(["admin", "member"]), deleteTask);

module.exports = router;