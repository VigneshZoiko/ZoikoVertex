const { Router } = require("express");
const { uploadFile, upload } = require("../controllers/uploadController");

const router = Router();

router.post("/", upload.single("file"), uploadFile);

module.exports = router;
