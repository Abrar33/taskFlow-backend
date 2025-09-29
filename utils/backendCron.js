// backend/cron/deadlineCron.js
const cron = require("node-cron");
const Task = require("../Model/task-model");
const Notification = require("../Model/notifications-model");
const User = require("../Model/user-model");
const Board = require("../Model/board-model");
const { sendEmail } = require("../utils/sendEmail");

module.exports = (io) => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() +24 * 60 * 60 * 1000);

      // Find tasks whose deadline is exactly 1 hour away
      const tasks = await Task.find({
        deadline: { $gte: now, $lte: oneHourLater },
        completed: false,
      });
      for (const task of tasks) {
        const board = await Board.findById(task.boardId).populate("members.user");
        // Notify assigned users only
        for (const userId of task.assignedTo) {
          const user = await User.findById(userId);
          if (!user) continue;
          // Prevent duplicate reminders
          const alreadyExists = await Notification.findOne({
            recipient: user._id,
            type: "deadline_reminder",
            link: `/boards/${task.boardId}/tasks/${task._id}`,
          });
          if (alreadyExists) continue;
          const notif = new Notification({
            message: `⏰ Reminder: Task '${task.title}' is due in 1 hour.`,
            type: "deadline_reminder",
            recipient: user._id,
            link: `/boards/${task.boardId}/tasks/${task._id}`,
          });
          const saved = await notif.save();

          io.to(user._id.toString()).emit("new_notification", saved);

          // Send Email Reminder
          if (user.email) {
            await sendEmail({
              to: user.email,
              subject: `Reminder: Task '${task.title}' due in 1 hour`,
              html: `
                <h3>Hello ${user.name},</h3>
                <p>This is a reminder that your task <b>${task.title}</b> is due in 1 hour.</p>
                <p><a href="${process.env.CLIENT_URL}/boards/${task.boardId}/tasks/${task._id}">View Task</a></p>
              `,
            });
          }
        }
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  });
};
