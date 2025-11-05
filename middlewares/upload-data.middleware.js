const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const { asyncHandler } = require("../utils/async-handler");
const { fileInfo } = require("../utils/file-info");

const checkNumberOfHeaderColumnsMiddleware = asyncHandler(
  async (req, res, next) => {
    console.log("Check number of header columns middleware");

    const filePath = path.join(__dirname, "../uploads/data.xlsx");
    const workbook = xlsx.readFile(filePath);

    const numberOfColumnsInfo = [];
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetJsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      // Skip empty sheets
      if (sheetJsonData.length === 0) return;

      const sheetColumnNames = sheetJsonData[0];

      if (sheetColumnNames.length < 4) {
        numberOfColumnsInfo.push({
          sheetName: sheetName,
          numberOfColumns: sheetColumnNames.length,
          message: `Minimum number of columns required 4. got only ${sheetColumnNames.length} columns in ${sheetName}`,
        });
      } else if (sheetColumnNames.length > 11) {
        numberOfColumnsInfo.push({
          sheetName: sheetName,
          numberOfColumns: sheetColumnNames.length,
          message: `Maximum number of columns required 11. got ${sheetColumnNames.length} columns ${sheetName}`,
        });
      }
    });

    if (numberOfColumnsInfo.length > 0) {
      return res.status(400).json({
        success: "fail",
        type: "InvalidNumberOfColumnsError",
        details: numberOfColumnsInfo,
        message: "Some sheets have invalid number of columns",
      });
    }

    next();
  }
);

const checkMandatoryHeaderColumnsMiddleware = asyncHandler(
  async (req, res, next) => {
    console.log("Check mandatory headr columns middleware");

    const filePath = path.join(__dirname, "../uploads/data.xlsx");
    const workbook = xlsx.readFile(filePath);

    const dataCollectionMandatoryColumnNames =
      fileInfo.dataCollectionMandatoryColumnNames; // ["First Name", "Email", "Phone", "Country"]

    // check whether workbook contains the mandatory columns

    const missingInfo = [];
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetJsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      // Skip empty sheets
      if (sheetJsonData.length === 0) return;

      const sheetColumnNames = sheetJsonData[0];

      // console.log(sheetColumnNames);

      // check if there is no sheet or no data in the sheet
      if (!sheetColumnNames || sheetColumnNames.length === 0) {
        missingInfo.push({
          sheetName: sheetName,
          missingCoulumnNames: ["First Name", "Email", "Phone", "Country"],
          message: `Missing mandatory columns: First Name, Email, Phone, Country in ${sheetName}`,
        });
        return;
      }

      // Find missing mandatory columns (case-sensitive match)
      const missingColumnNames = dataCollectionMandatoryColumnNames.filter(
        (column) => {
          return !sheetColumnNames.includes(column);
        }
      );

      if (missingColumnNames.length > 0) {
        missingInfo.push({
          sheetName: sheetName,
          missingCoulumnNames: missingColumnNames,
          message: `Missing mandatory column: ${missingColumnNames.join(
            ", "
          )} in ${sheetName}`,
        });
      }
    });

    if (missingInfo.length > 0) {
      return res.status(400).json({
        success: "fail",
        type: "MissingMandatoryColumnsError",
        details: missingInfo,
        message: "Some sheets are missing mandatory columns.",
      });
    }

    next();
  }
);

const checkColumnNamesMappingMiddleware = asyncHandler(
  async (req, res, next) => {
    console.log("Check column names mapping");

    const filePath = path.join(__dirname, "../uploads/data.xlsx");
    const workbook = xlsx.readFile(filePath);

    const columnNamesMappingInfo = [];
    let allSheetsAreFullyMatched = true;
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetJsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      // Skip empty sheets
      if (sheetJsonData.length === 0) return;

      const sheetColumnNames = sheetJsonData[0];

      // compare sheet column names with data collection columns
      const dataCollectionMaskedColumnNames =
        fileInfo.dataCollectionMaskedColumnNames;

      // find missing file columns
      const missingColumns = dataCollectionMaskedColumnNames.filter(
        (columnName) => {
          return !sheetColumnNames.includes(columnName);
        }
      );

      console.log("Missing columns");
      console.log(missingColumns);

      // find extra file columns
      const extraColumns = sheetColumnNames.filter((columnName) => {
        return !dataCollectionMaskedColumnNames.includes(columnName);
      });

      console.log("Extra columns");
      console.log(extraColumns);

      // Earlier code
      // const sheetIsFullyMatched =
      //   missingColumns.length === 0 && extraColumns.length === 0;

      // New code - 1
      // const sheetIsFullyMatched =
      //   sheetColumnNames.length === 4 ||
      //   (sheetColumnNames.length >= 4 && sheetColumnNames.length <= 11) ||
      //   (missingColumns.length === 0 && extraColumns.length === 0);

      // New code - 2
      const sheetIsFullyMatched =
        sheetColumnNames.length >= 4 &&
        sheetColumnNames.length <= 11 &&
        extraColumns.length === 0;

      if (!sheetIsFullyMatched) {
        allSheetsAreFullyMatched = false;
        columnNamesMappingInfo.push({
          sheetName: sheetName,
          sheetIsFullyMatched: sheetIsFullyMatched,
          missingColumnNames: missingColumns,
          extraColumnNames: extraColumns,
          sheetColumnNames: sheetColumnNames,
          maskedColumnNames: dataCollectionMaskedColumnNames,
          message: `Column names are partially matched in sheet: ${sheetName}`,
        });
      }

      if (sheetIsFullyMatched) {
        columnNamesMappingInfo.push({
          sheetName: sheetName,
          sheetIsFullyMatched: sheetIsFullyMatched,
          sheetColumnNames: sheetColumnNames,
          maskedColumnNames: dataCollectionMaskedColumnNames,
          message: `Column names are fully matched in sheet: ${sheetName}`,
        });
      }
    });

    // Save column names mapping info to a local file
    // So that validation can be done while saving the data
    const columnNamesMappingFormat = {};
    if (!allSheetsAreFullyMatched) {
      columnNamesMappingInfo.forEach((sheet) => {
        if (!sheet.sheetIsFullyMatched) {
          columnNamesMappingFormat[sheet.sheetName] = {};
          sheet.extraColumnNames.forEach((columnName) => {
            columnNamesMappingFormat[sheet.sheetName][columnName] = "";
          });
        }
      });
      const columnNamesMappingFormatFilePath = path.join(
        __dirname,
        "../uploads/column-names-mapping-format.json"
      );
      const columnNamesMappingFormatJsonString = JSON.stringify(
        columnNamesMappingFormat
      );
      fs.writeFileSync(
        columnNamesMappingFormatFilePath,
        columnNamesMappingFormatJsonString,
        "utf8"
      );
    } else if (allSheetsAreFullyMatched) {
      const columnNamesMappingFormatFilePath = path.join(
        __dirname,
        "../uploads/column-names-mapping-format.json"
      );
      const columnNamesMappingFormatJsonString = JSON.stringify({});
      fs.writeFileSync(
        columnNamesMappingFormatFilePath,
        columnNamesMappingFormatJsonString,
        "utf8"
      );
    }

    if (!allSheetsAreFullyMatched) {
      return res.status(400).json({
        success: "fail",
        type: "MappingError",
        allSheetsAreFullyMatched: allSheetsAreFullyMatched,
        columnNamesMappingFormat: columnNamesMappingFormat,
        details: columnNamesMappingInfo,
        message: "Sheets are partially matched",
      });
    } else if (allSheetsAreFullyMatched) {
      return res.status(200).json({
        success: "success",
        type: "MappingSuccess",
        allSheetsAreFullyMatched: allSheetsAreFullyMatched,
        details: columnNamesMappingInfo,
        message: "Sheets are fully matched",
      });
    }

    next();
  }
);

module.exports = {
  checkMandatoryHeaderColumnsMiddleware,
  checkNumberOfHeaderColumnsMiddleware,
  checkColumnNamesMappingMiddleware,
};
