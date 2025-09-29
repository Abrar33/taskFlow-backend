const Task = require("../Model/task-model");
const Notification = require("../Model/notifications-model");
const nodemailer = require("nodemailer");
const User = require("../Model/user-model");
const Board = require("../Model/board-model");
const { sendEmail } = require("../utils/sendEmail");

const createTask = async (req, res) => {
  try {
    const { listId, title, description, deadline, attachment, assignedTo } =
      req.body;
    const boardId = req.board._id;

    if (!listId) {
      return res.status(400).json({ message: "listId is required" });
    }

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });
    const memberIds = board.members.map((m) => m.user.toString());

    // ✅ Validate assigned users (must be board members)
    let validAssignedTo = [];
    if (Array.isArray(assignedTo) && assignedTo.length > 0) {
      const invalidUsers = assignedTo.filter(
        (userId) => !memberIds.includes(userId.toString())
      );

      if (invalidUsers.length > 0) {
        return res.status(400).json({
          message: "Some assigned users are not members of this board",
        });
      }

      validAssignedTo = assignedTo;
    }

    // ✅ Position handling
    const lastTask = await Task.findOne({ listId }).sort("-position");
    const position = lastTask ? lastTask.position + 1 : 0;

    // ✅ Create Task
    const task = await Task.create({
      boardId,
      listId,
      title,
      description,
      deadline,
      attachment,
      position,
      createdBy: req.user._id,
      assignedTo: validAssignedTo,
    });

    res.status(201).json(task);

    const io = req.app.get("io");
    if (!io) return;

    // ✅ Broadcast task update to board
    io.to(boardId.toString()).emit("taskChanged", {
      type: "created",
      task,
    });

    // ✅ Notify all board members (except creator)
    const message = `Task '${task.title}' was created by ${req.user.name}.`;
    for (const member of board.members) {
      if (member.user.toString() === req.user._id.toString()) continue;

      const notification = await Notification.create({
        message,
        type: "board_action",
        recipient: member.user,
        link: `/boards/${boardId}/tasks/${task._id}`,
      });

      io.to(member.user._id.toString()).emit("new_notification", notification);
    }

    // ✅ Notify assigned users (extra)
if (validAssignedTo.length > 0) {
  for (const userId of validAssignedTo) {
    if (userId.toString() === req.user._id.toString()) continue;

    const assignedUser = await User.findById(userId);
    if (!assignedUser || !assignedUser.email) continue;

    const notification = await Notification.create({
      message: `You have been assigned to task '${task.title}'.`,
      type: "task_assignment",
      recipient: userId,
      link: `/boards/${boardId}/tasks/${task._id}`,
    });

    const room = userId.toString();
    io.to(room).emit("new_notification", notification);

    // ✅ Send Email to Assigned User
    // const transporter = nodemailer.createTransport({
    //   service: "Gmail",
    //   auth: {
    //     user: process.env.SMTP_MAIL,
    //     pass: process.env.SMTP_PASSWORD,
    //   },
    // });

    // const mailOptions = {
    //   from: `"${req.user.name}" <${process.env.SMTP_MAIL}>`,
    //   to: assignedUser.email,
    //   subject: `You’ve been assigned a new task in ${board.name}`,
    //   html: `
    //     <h3>Hello ${assignedUser.name},</h3>
    //     <p>You’ve been assigned a new task in the board <b>${board.name}</b>.</p>
    //     <p><b>Task:</b> ${task.title}</p>
    //     <p><b>Assigned by:</b> ${req.user.name}</p>
    //     <p><a href="${process.env.CLIENT_URL}/boards/${boardId}">View Task</a></p>
    //     <br/>
    //     <p>Thanks,</p>
    //     <p>Team Board</p>
    //   `,
    // };

    // await transporter.sendMail(mailOptions);
    await sendEmail({
  to: assignedUser.email,
  subject: `You’ve been assigned a new task in ${board.name}`,
  html: `
    <h3>Hello ${assignedUser.name},</h3>
    <p>You’ve been assigned a new task in the board <b>${board.name}</b>.</p>
    <p><b>Task:</b> ${task.title}</p>
    <p><b>Assigned by:</b> ${req.user.name}</p>
    <p><a href="${process.env.CLIENT_URL}/boards/${boardId}">View Task</a></p>
    <br/>
    <p>Thanks,</p>
    <p>Team Board</p>
  `,
  from: `"${req.user.name}" <${process.env.SMTP_MAIL}>`, // optional override
});
    console.log(`📧 Email sent to ${assignedUser.email} about task assignment`);
  }
}

  } catch (error) {
    console.error("Error in createTask:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all tasks for a board (grouped by list)
// Change this function to return a flat array
const getTasks = async (req, res) => {
  try {
    // Simply find all tasks for the board
    const tasks = await Task.find({ boardId: req.board._id }).sort({
      listId: 1,
      position: 1,
    });
    res.json(tasks); // Return the array directly
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Task
const updateTask = async (req, res) => {
  try {
    const {
      title,
      description,
      deadline,
      attachment,
      listId,
      position,
      completed,
      assignedTo, // Using the correct field name from the schema
    } = req.body;

    const task = await Task.findOne({
      _id: req.params.taskId,
      boardId: req.params.id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const boardMember = req.board.members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    const isAdmin = boardMember && boardMember.role === "admin";
    
    // Check if the user is assigned to the task
    const isAssigned = task.assignedTo.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    // Permission logic:
    if (!isAdmin) {
      // Non-admin users can only update the 'completed' status if they are assigned.
      if (isAssigned) {
        if (completed !== undefined) {
          task.completed = completed;
        } else {
          return res.status(403).json({
            message: "You can only update the completion status of this task.",
          });
        }
      } else {
        return res.status(403).json({
          message: "You do not have permission to update this task.",
        });
      }
    } else {
      // User is an admin, they can update any field.
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (deadline !== undefined) task.deadline = deadline;
      if (attachment !== undefined) task.attachment = attachment;
      if (completed !== undefined) task.completed = completed;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
      
      // Drag-and-drop logic for admins
      const oldPosition = task.position;
      if (listId && listId !== task.listId.toString()) {
        await Task.updateMany(
          { listId: task.listId, position: { $gt: oldPosition } },
          { $inc: { position: -1 } }
        );
        const insertPosition = position !== undefined ? position : 0;
        await Task.updateMany(
          { listId, position: { $gte: insertPosition } },
          { $inc: { position: 1 } }
        );
        task.position = insertPosition;
        task.listId = listId;
      } else if (position !== undefined && position !== oldPosition) {
        if (position > oldPosition) {
          await Task.updateMany(
            {
              listId: task.listId,
              position: { $gt: oldPosition, $lte: position },
            },
            { $inc: { position: -1 } }
          );
        } else {
          await Task.updateMany(
            {
              listId: task.listId,
              position: { $gte: position, $lt: oldPosition },
            },
            { $inc: { position: 1 } }
          );
        }
        task.position = position;
      }
    }

    await task.save();
    res.json(task);

    // Real-time updates
    const io = req.app.get("io");
if (io) {
  const boardId = task.boardId.toString();
  const board = req.board;

  // 🔹 CASE 1: Task marked as completed (send a special notification)
  if (completed === true) {
    const message = `Task '${task.title}' was completed by ${req.user.name}.`;

    for (const member of board.members) {
      if (member.user.toString() !== req.user._id.toString()) {
        const notification = new Notification({
          message,
          type: "board_action",
          recipient: member.user,
          link: `/boards/${boardId}/tasks/${task._id}`,
        });
        const saved = await notification.save();
        io.to(member.user._id.toString()).emit("new_notification", saved);
      }
    }
  } else {
    // 🔹 CASE 2: Normal update (admin changing fields, etc.)
    const message = `Task '${task.title}' was updated by ${req.user.name}.`;
    for (const member of board.members) {
      if (member.user.toString() !== req.user._id.toString()) {
        const notification = new Notification({
          message,
          type: "board_action",
          recipient: member.user,
          link: `/boards/${boardId}`,
        });
        const saved = await notification.save();
        io.to(member.user._id.toString()).emit("new_notification", saved);
      }
    }
  }

  // 🔹 Always emit taskChanged to the board room
  io.to(boardId).emit("taskChanged", {
    type: "updated",
    task,
    taskId: task._id.toString(),
  });
}
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Task
// DELETE /api/boards/:id/tasks/:taskId

// DELETE /api/boards/:id/tasks/:taskId
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      boardId: req.params.id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });

    const io = req.app.get("io");
    if (io) {
      const message = `Task '${task.title}' was deleted by ${req.user.name}.`;
      const board = req.board;

      // ✅ CORRECT: Iterate through all members to create and emit notifications
      for (const member of board.members) {
        if (member.user.toString() !== req.user._id.toString()) {
          const notification = new Notification({
            message,
            type: "board_action",
            recipient: member.user,
            link: `/boards/${board._id}`, // Link to the board
          });
          await notification.save();
          io.to(member.user._id.toString()).emit(
            "new_notification",
            notification
          );
        }
      }

      // ✅ CORRECT: Emit taskChanged event to the specific board's room
      io.to(req.params.id).emit("taskChanged", {
        type: "deleted",
        // boardId is now included to help the frontend filter
        boardId: req.params.id,
        taskId: req.params.taskId,
      });
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports = { createTask, getTasks, updateTask, deleteTask };
