const express = require("express");

const { dataController } = require("../controllers/data.controller");
const { upload } = require("../middlewares/multer.middleware");
const {
  checkMandatoryHeaderColumnsMiddleware,
  checkNumberOfHeaderColumnsMiddleware,
  checkColumnNamesMappingMiddleware,
} = require("../middlewares/upload-data.middleware");
const {
  validateColumnNamesMappingMiddleware,
  checkDuplicateInColumnNamesMappingMiddleware,
} = require("../middlewares/save-data.middleware");

const dataRouter = express.Router();

dataRouter.get("/", dataController.getData);
dataRouter.post("/delete-upload", dataController.deleteUploadedFile);

// Upload route
dataRouter.post(
  "/upload",
  upload.single("file"),
  checkNumberOfHeaderColumnsMiddleware,
  checkMandatoryHeaderColumnsMiddleware,
  checkColumnNamesMappingMiddleware,
  dataController.uploadData
);

// Save route
dataRouter.post(
  "/save",
  validateColumnNamesMappingMiddleware,
  checkDuplicateInColumnNamesMappingMiddleware,
  dataController.saveData
);

dataRouter.post("/save-mapping-success", dataController.saveDataSuccess);
dataRouter.post("/save-mapping-error", dataController.saveDataError);

module.exports = { dataRouter };
