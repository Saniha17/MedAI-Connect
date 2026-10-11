
const express = require("express");

const router = express.Router();
const { testAPI } = require("../controllers/testController");

router.get("/test", testAPI);

module.exports = router;