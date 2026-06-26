const { Router } = require("express");
const { escalateIssue, getEscalations, getEscalationById } = require("../controllers/escalateController");

const router = Router();

router.post("/", escalateIssue);
router.get("/", getEscalations);
router.get("/:id", getEscalationById);

module.exports = router;