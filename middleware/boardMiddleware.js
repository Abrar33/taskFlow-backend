// backend/middleware/boardMiddleware.js
const Board = require("../Model/board-model");

const requireBoardRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params; // Get board ID from URL params

      const board = await Board.findById(id).populate('members.user', 'name');
      if (!board) {
        return res.status(404).json({ message: "Board not found." });
      }

      // Find the current user's role on this board
      const member = board.members.find(
        (m) => m.user._id.toString() === req.user._id.toString()
      );

      if (!member) {
        return res.status(403).json({ message: "Access denied. You are not a member of this board." });
      }

      // Check if the member's role is included in the required roles
      if (!requiredRoles.includes(member.role)) {
        return res.status(403).json({ message: "Access denied. Insufficient permissions." });
      }

      // Attach the board object to the request for use in controllers
      req.board = board;
      next();

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error." });
    }
  };
};

module.exports = { requireBoardRole };