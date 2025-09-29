const express = require("express");
const router = express.Router();
const {
  createBoard,
  getBoards,
  getBoard,
  deleteBoard,
  inviteUser,
  verifyInvite,
  joinBoardWithToken,
  removeUser,
  addList,
  deleteList,
  updateListsOrder,
} = require("../Controller/board-controller");
const { protect } = require("../middleware/authMiddleware");
const { requireBoardRole } = require("../middleware/boardMiddleware");

router.post("/", protect, createBoard);

router.get("/", protect, getBoards);
router.get("/:id", protect, getBoard);

router.post("/:id/invite", protect, requireBoardRole(["admin"]), inviteUser);

router.get("/invite/verify", verifyInvite);

router.post("/join", protect, joinBoardWithToken);
router.delete("/:id/remove-user", protect, requireBoardRole(["admin"]), removeUser);
router.delete("/:id", protect, requireBoardRole(["admin"]), deleteBoard);


router.post("/:id/lists", protect, requireBoardRole(["admin", "member"]), addList);

router.delete("/:id/lists/:listId", protect, requireBoardRole(["admin", "member"]), deleteList);
router.put("/:id/lists/order", protect, requireBoardRole(["admin", "member"]), updateListsOrder);

module.exports = router;
