const { asyncHandler } = require("../utils/async-handler");

const validateColumnNamesMappingMiddleware = asyncHandler(
  async (req, res, next) => {
    /**
     * req.body = {
     *  columnNamesMappingFormatFromClient: {...},
     *  allSheetsAreFullyMatched: true/false,
     *  saveAnyway: true/false,
     * }
     */

    const {
      columnNamesMappingFormatFromClient,
      allSheetsAreFullyMatched,
      saveAnyway,
    } = { ...req.body };

    // if all sheets are fully matched -> next();
    if (allSheetsAreFullyMatched) next();

    // if all sheets are not fully matched and save anyway is false -> return response;
    if (!allSheetsAreFullyMatched && !saveAnyway) {
      return res.status(400).json({
        status: "fail",
        type: "ColumnNamesMappingError",
        message: "",
      });
    }

    // if all sheets are not fully matched and save anyway is true -> next();

    next();
  }
);

const checkDuplicateInColumnNamesMappingMiddleware = asyncHandler(
  async (req, res, next) => {
    // if there is any duplicate mapping in the mapped sheet -> return response;

    // if there is not any duplicate mapping in the mapped sheet -> next();

    next();
  }
);

const saveMatchedSheets = asyncHandler(async (req, res, next) => {
  // save only those sheets which are fully matched
  next();
});

const saveMappedSheets = asyncHandler(async (req, res, next) => {
  // save only those sheets which are fully mapped
  next();
});

module.exports = {
  validateColumnNamesMappingMiddleware,
  checkDuplicateInColumnNamesMappingMiddleware,
};
