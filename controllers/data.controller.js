const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const { asyncHandler } = require("../utils/async-handler");
const { Data } = require("../models/data.model");

const { fileInfo } = require("../utils/file-info");

const getData = asyncHandler(async (req, res) => {
  const data = await Data.find({});
  res.status(200).json({
    status: "success",
    data: data,
    message: "data fetched successfully",
  });
});

const deleteUploadedFile = asyncHandler(async (req, res) => {
  const filePath = path.join(process.cwd(), "uploads", "data.xlsx");
  if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  return res.status(200).json({
    status: "success",
    message: "Uploaded file deleted successfully",
  });
});

const uploadData = asyncHandler(async (req, res) => {
  return res.status(200).json({ message: "Upload Data" });
});

const saveData = asyncHandler(async (req, res) => {
  return res.status(200).json({ message: "Save Data" });
});

const saveDataSuccess = asyncHandler(async (req, res) => {
  const filePath = path.join(__dirname, "../uploads/data.xlsx");

  // Check if Excel file exists
  if (!fs.existsSync(filePath)) {
    return res.status(400).json({
      status: "fail",
      type: "FileNotFoundError",
      message: "Excel file not found in uploads directory",
    });
  }

  // Read workbook
  const workbook = xlsx.readFile(filePath);
  const { dataCollectionMaskedColumnNames, dataCollectionColumnNames } =
    fileInfo;

  const allData = [];

  // Step 1: Read and normalize data from all sheets
  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = xlsx.utils.sheet_to_json(worksheet, { defval: null });
    if (sheetData.length === 0) return;

    const renamedData = sheetData.map((row) => {
      const newRow = {};
      dataCollectionMaskedColumnNames.forEach((maskedCol, index) => {
        const realCol = dataCollectionColumnNames[index];
        newRow[realCol] =
          row[maskedCol] !== undefined ? String(row[maskedCol]).trim() : null;
      });
      return newRow;
    });

    allData.push(...renamedData);
  });

  if (allData.length === 0) {
    return res.status(400).json({
      status: "fail",
      message: "No data found in Excel file",
    });
  }

  // Step 2: Validate and remove duplicates
  const requiredFields = ["firstName", "email", "phone", "country"];
  const validData = [];
  const skippedData = [];

  const seenEmails = new Set();

  for (const doc of allData) {
    const isValid = requiredFields.every(
      (field) => doc[field] && String(doc[field]).trim() !== ""
    );

    const email = doc.email ? doc.email.toLowerCase() : null;

    if (!isValid) {
      skippedData.push({ ...doc, reason: "Missing required fields" });
      continue;
    }

    if (seenEmails.has(email)) {
      skippedData.push({ ...doc, reason: "Duplicate email in file" });
      continue;
    }

    seenEmails.add(email);
    validData.push(doc);
  }

  // Step 3: Save valid records to MongoDB
  // let insertedCount = 0;

  // if (validData.length > 0) {
  //   const result = await Data.insertMany(validData, { ordered: false });
  //   insertedCount = result.length;
  // }

  const operations = allData.map((doc) => ({
    updateOne: {
      filter: { email: doc.email },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));

  const allSavedData = await Data.bulkWrite(operations, { ordered: false });

  const insertedIds = Object.values(allSavedData.upsertedIds);

  // Fetch inserted documents
  let insertedDocs = [];
  if (insertedIds.length > 0) {
    insertedDocs = await Data.find({ _id: { $in: insertedIds } });
  }

  // Delete the uploaded file before sending the response
  await fs.promises.unlink(filePath);

  // Step 4: Return summary response
  // keep in mind that we are not sending the info about duplicate emails while inserting the data
  // do it later
  return res.status(200).json({
    status: "success",
    type: "DataSaved",
    message: "Data processed successfully",
    totalRecords: allData.length,
    insertedRecords: insertedDocs.length,
    skippedRecords: allData.length - insertedDocs.length,
    skippedReasons: {
      missingRequiredFields: skippedData.filter(
        (d) => d.reason === "Missing required fields"
      ).length,
      duplicateEmails: skippedData.filter(
        (d) => d.reason === "Duplicate email in file"
      ).length,
    },
  });
});

const saveDataError = asyncHandler(async (req, res) => {
  const { matchedSheets, mappedSheets, columnNamesMappingFormatClient } =
    req.body;

  const filePath = path.join(__dirname, "../uploads/data.xlsx");
  const workbook = xlsx.readFile(filePath);

  /** Get all the matched data */
  const matchedData = [];
  matchedSheets.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
    data.forEach((item) => {
      matchedData.push(item);
    });
  });
  // console.log(matchedData);

  /** Get all the mapped data */
  const mappedData = [];
  mappedSheets.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    let data = xlsx.utils.sheet_to_json(sheet, { defval: null });

    data = data.map((obj) => {
      const newObj = {};
      for (const key in obj) {
        if (columnNamesMappingFormatClient[sheetName][key]) {
          newObj[columnNamesMappingFormatClient[sheetName][key]] = obj[key]; // rename column
        } else {
          newObj[key] = obj[key]; // keep original column
        }
      }
      return newObj;
    });
    data.forEach((item) => {
      mappedData.push(item);
    });
  });

  let allData = [...matchedData, ...mappedData];

  /** Now map all masked column names with database column names */
  const { mappingColumnNames } = fileInfo;
  allData = allData.map((obj) => {
    const newObj = {};
    for (const key in obj) {
      if (mappingColumnNames[key]) {
        newObj[mappingColumnNames[key]] = obj[key];
      }
    }
    return newObj;
  });

  // Step 2: Validate and remove duplicates
  const requiredFields = ["firstName", "email", "phone", "country"];
  const validData = [];
  const skippedData = [];

  const seenEmails = new Set();

  for (const doc of allData) {
    const isValid = requiredFields.every(
      (field) => doc[field] && String(doc[field]).trim() !== ""
    );

    const email = doc.email ? doc.email.toLowerCase() : null;

    if (!isValid) {
      skippedData.push({ ...doc, reason: "Missing required fields" });
      continue;
    }

    if (seenEmails.has(email)) {
      skippedData.push({ ...doc, reason: "Duplicate email in file" });
      continue;
    }

    seenEmails.add(email);
    validData.push(doc);
  }

  // Step 3: Save valid records to MongoDB
  // let insertedCount = 0;

  // if (validData.length > 0) {
  //   const result = await Data.insertMany(validData, { ordered: false });
  //   insertedCount = result.length;
  // }

  const operations = allData.map((doc) => ({
    updateOne: {
      filter: { email: doc.email },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));

  const allSavedData = await Data.bulkWrite(operations, { ordered: false });

  const insertedIds = Object.values(allSavedData.upsertedIds);

  // Fetch inserted documents
  let insertedDocs = [];
  if (insertedIds.length > 0) {
    insertedDocs = await Data.find({ _id: { $in: insertedIds } });
  }

  // Delete the uploaded file before sending the response
  await fs.promises.unlink(filePath);

  // Step 4: Return summary response
  // keep in mind that we are not sending the info about duplicate emails while inserting the data
  // do it later
  return res.status(200).json({
    status: "success",
    type: "DataSaved",
    message: "Data processed successfully",
    totalRecords: allData.length,
    insertedRecords: insertedDocs.length,
    skippedRecords: allData.length - insertedDocs.length,
    skippedReasons: {
      missingRequiredFields: skippedData.filter(
        (d) => d.reason === "Missing required fields"
      ).length,
      duplicateEmails: skippedData.filter(
        (d) => d.reason === "Duplicate email in file"
      ).length,
    },
  });
});

const dataController = {
  getData,
  uploadData,
  deleteUploadedFile,
  saveData,
  saveDataSuccess,
  saveDataError,
};

module.exports = { dataController };
