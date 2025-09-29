const Board = require("../Model/board-model");
const Notification = require("../Model/notifications-model");
const User = require("../Model/user-model");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { sendEmail } = require("../utils/sendEmail");
const Task=require("../Model/task-model");
// ✅ Helper: send notifications to board members
const notifyBoardMembers = async ({ io, board, actorId, message, link }) => {
  for (const member of board.members) {
    console.log('Notifying member', member.user.toString(), 'actorId', actorId.toString());
    if (member.user.toString() !== actorId.toString()) {
      const notification = new Notification({
        message,
        type: "board_action",
        recipient: member.user,
        link,
      });
      const saved = await notification.save();
      console.log('Notification sent to', member.user.toString());
      io.to(member.user.toString()).emit("new_notification", saved);
    }else{console.log('Skipping notification for actor', actorId.toString());}
  }
};
const addList = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "List name is required" });
    }

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const newList = { name };
    board.lists.push(newList);
    await board.save();

    const savedList = board.lists[board.lists.length - 1];
    const io = req.app.get("io");

    if (io) {
      const message = `A new list '${savedList.name}' was added by ${req.user.name}.`;
console.log(message,'msg',board._id);
      await notifyBoardMembers({
        io,
        board,
        actorId: req.user._id,
        message,
        link: `/boards/${board._id}`,
      });

      // 🔥 broadcast to all board members in socket room
      io.to(board._id.toString()).emit("listChanged", {
        type: "created",
        list: savedList,
        boardId: board._id,
      });
    }

    res.status(201).json({ message: "List added successfully", list: savedList, board });
  } catch (error) {
    res.status(500).json({ message: "Error adding list", error });
  }
};
// ✅ Create Board
const createBoard = async (req, res) => {
  try {
    const board = await Board.create({
      name: req.body.name,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: "admin" }],
    });

    const io = req.app.get("io");
    const message = `You created a new board: '${board.name}'.`;

    // self notification
    const notification = new Notification({
      message,
      type: "board_action",
      recipient: req.user._id,
      link: `/boards/${board._id}`,
    });
    await notification.save();
    io.to(req.user._id.toString()).emit("new_notification", notification);

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: "Error creating board", error });
  }
};

// ✅ Get all boards for logged-in user
const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({ "members.user": req.user._id }).populate(
      "members.user",
      "name email"
    );
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: "Error fetching boards", error });
  }
};

// ✅ Get single board
const getBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id).populate(
      "members.user",
      "name email"
    );
    if (!board) return res.status(404).json({ message: "Board not found" });
    res.json(board);
  } catch (error) {
    res.status(500).json({ message: "Error fetching board", error });
  }
};


const inviteUser = async (req, res) => {
  try {
    const { email } = req.body;
    const { id } = req.params;

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    // Find invited user by email
    const invitedUser = await User.findOne({ email });

    // Check if user is already a member
    const alreadyMember = board.members.some((m) => {
      // Check against both ID (if user exists) and email (in case user isn't found)
      return invitedUser ? m.user.toString() === invitedUser._id.toString() : false;
    });

    if (alreadyMember) {
      return res.status(400).json({ message: "User is already a member of this board" });
    }

    // If user exists, add them to the board's members with invitationAccepted: false
    if (invitedUser) {
      board.members.push({ user: invitedUser._id, role: "member", invitationAccepted: false });
      await board.save();
    }

    // create invite token
    const token = jwt.sign({ boardId: id, email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const inviteLink = `${process.env.CLIENT_URL}/invite/accept?token=${token}`;

    // send email
//     const transporter = nodemailer.createTransport({
//       service: "Gmail",
//       auth: {
//         user: process.env.SMTP_MAIL,
//         pass: process.env.SMTP_PASSWORD,
//       },
//     });

//     await transporter.sendMail({
//       from: `"Team Board" <${process.env.SMTP_MAIL}>`,
//       to: email,
//       subject: "You're invited to join a board 🎉",
//       html: `
//         <h3>Hello,</h3>
//         <p>You’ve been invited to join the board <b>${board.name}</b>.</p>
//         <p><a href="${inviteLink}" target="_blank">Click here to accept the invite</a></p>
//         <p>This link will expire in 24 hours.</p>
//       `,
//     });
await sendEmail({
  to: email,
  subject: "You're invited to join a board 🎉",
  html: `
    <h3>Hello,</h3>
    <p>You’ve been invited to join the board <b>${board.name}</b>.</p>
    <p><a href="${inviteLink}" target="_blank">Click here to accept the invite</a></p>
    <p>This link will expire in 24 hours.</p>
  `,
});
    const io = req.app.get("io");

    // Real-time notification for the invited user (if they exist)
    if (invitedUser && io) {
      const notifForInvited = new Notification({
        message: `You’ve been invited to join the board '${board.name}' by ${req.user.name}.`,
        type: "board_action",
        recipient: invitedUser._id,
        link: `/invite/accept?token=${token}`,
      });
      const savedNotifForInvited = await notifForInvited.save();
      io.to(invitedUser._id.toString()).emit("new_notification", savedNotifForInvited);
    }

    // Notification for the admin
    if (req.user && io) {
      const notifForAdmin = new Notification({
        message: `You have successfully invited '${email}' to the board '${board.name}'.`,
        type: "board_action",
        recipient: req.user._id,
        link: `/boards/${board._id}`,
      });
      const savedNotifForAdmin = await notifForAdmin.save();
      io.to(req.user._id.toString()).emit("new_notification", savedNotifForAdmin);
    }

    res.json({ message: "Invite sent successfully", inviteLink });
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).json({ message: "Error sending invite", error });
  }
};

// ✅ Verify invite token (check board + email)
const verifyInvite = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { boardId, email } = decoded;

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const userExists = await User.findOne({ email });

    res.json({
      boardId,
      boardName: board.name,
      email,
      exists: !!userExists,
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

// ✅ Join board with token (finalize invite)
// ✅ Join board with token (finalize invite)
const joinBoardWithToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { boardId, email } = decoded;

    if (req.user.email !== email) {
      return res.status(403).json({ message: "Invite email does not match logged in user" });
    }

    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });

    // Find the member in the board's members array
    const member = board.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member) {
      // This case should not be reached with the new logic, but is a good safeguard
      board.members.push({ user: req.user._id, role: "member", invitationAccepted: true });
      await board.save();
    } else if (member.invitationAccepted) {
      // The invite has already been processed, prevent duplicates
      return res.json({ message: "Already a member", board });
    } else {
      // Accept the invite by updating the flag
      member.invitationAccepted = true;
      await board.save();
    }

    const io = req.app.get("io");
    const message = `${req.user.name} joined the board '${board.name}'.`;

    if (io) {
      await notifyBoardMembers({
        io,
        board,
        actorId: req.user._id,
        message,
        link: `/boards/${board._id}`,
      });
      io.to(board._id.toString()).emit("boardChanged", {
        type: "memberJoined",
        boardId: board._id,
        user: req.user,
      });
    }

    res.json({ message: "Joined board successfully", board });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid or expired token" });
  }
};
// ✅ Remove user
const removeUser = async (req, res) => {
  console.log(req.params,'cccc')
  try {
    const { userId } = req.body;
    const board = await Board.findById(req.params.id).populate("members.user");
    if (!board) return res.status(404).json({ message: `${req.params} error` });

    // Find the user to be removed
    const removedMember = board.members.find((m) => m.user._id.toString() === userId);
    if (!removedMember) {
      return res.status(404).json({ message: "User is not a member of this board" });
    }

    // Filter out the user to be removed
    board.members = board.members.filter((m) => m.user._id.toString() !== userId);
    await board.save();

    const io = req.app.get("io");
    if (io) {
      // Notify remaining board members
      const message = `${req.user.name} removed ${removedMember.user.name} from '${board.name}'.`;
      await notifyBoardMembers({
        io,
        board,
        actorId: req.user._id,
        message,
        link: `/boards/${board._id}`,
      });

      // Notify the removed user
      const messageForRemovedUser = `You have been removed from the board '${board.name}'.`;
      const notifForRemoved = new Notification({
        message: messageForRemovedUser,
        type: "board_action",
        recipient: removedMember.user._id,
      });
      const savedNotifForRemoved = await notifForRemoved.save();
      io.to(removedMember.user._id.toString()).emit("new_notification", savedNotifForRemoved);

      // Disconnect the removed user from the board's socket room
      io.to(removedMember.user._id.toString()).emit("leaveBoard", { boardId: board._id });

      // Broadcast the change to the board's socket room
      io.to(board._id.toString()).emit("boardChanged", {
        type: "memberRemoved",
        boardId: board._id,
        removedUserId: userId,
      });
    }

    res.json({ message: "User removed successfully", board });
  } catch (error) {

    console.error("Error removing user:", error );
    res.status(500).json({ message: "Error removing user",  });
  }
};

// ✅ Delete board
const deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    await board.deleteOne();

    const io = req.app.get("io");
    const message = `Board '${board.name}' was deleted by ${req.user.name}.`;

    if (io) {
      await notifyBoardMembers({
        io,
        board,
        actorId: req.user._id,
        message,
        link: `/boards`,
      });

      io.to(board._id.toString()).emit("boardChanged", {
        type: "deleted",
        boardId: board._id,
      });
    }

    res.json({ message: "Board deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting board", error });
  }
};


// ✅ Delete list
const deleteList = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const list = board.lists.id(req.params.listId);
    if (!list) return res.status(404).json({ message: "List not found" });

    // Remove list from board
    board.lists = board.lists.filter(
      (l) => l._id.toString() !== req.params.listId
    );
    await board.save();

    // Delete all tasks belonging to this list
    await Task.deleteMany({ boardId: board._id, listId: req.params.listId });

    const io = req.app.get("io");
    const message = `A list '${list.name}' was deleted by ${req.user.name}.`;

    if (io) {
      await notifyBoardMembers({
        io,
        board,
        actorId: req.user._id,
        message,
        link: `/boards/${board._id}`,
      });

      io.to(board._id.toString()).emit("listChanged", {
        type: "deleted",
        listId: req.params.listId,
        boardId: board._id,
      });
    }

    res.json({ message: "List and its tasks deleted", board });
  } catch (error) {
    res.status(500).json({ message: "Error deleting list", error });
  }
};

// ✅ Update lists order
const updateListsOrder = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    board.lists = req.body.lists;
    await board.save();

    const io = req.app.get("io");
    const message = `${req.user.name} updated the list order in '${board.name}'.`;

    if (io) {
      await notifyBoardMembers({
        io,
        board,
        actorId: req.user._id,
        message,
        link: `/boards/${board._id}`,
      });

      io.to(board._id.toString()).emit("listChanged", {
        type: "reordered",
        lists: board.lists,
        boardId: board._id,
      });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: "Error updating order", error });
  }
};

module.exports = {
  createBoard,
  getBoards,
  getBoard,
  inviteUser,
  verifyInvite,
  joinBoardWithToken,
  removeUser,
  deleteBoard,
  addList,
  deleteList,
  updateListsOrder,
};
