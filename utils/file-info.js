const fileInfo = {
  dataCollectionColumnNames: [
    "firstName",
    "lastName",
    "email",
    "phone",
    "jobTitle",
    "department",
    "company",
    "street",
    "zipCode",
    "city",
    "country",
  ],
  dataCollectionMaskedColumnNames: [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Job Title",
    "Department",
    "Company",
    "Street",
    "Zip Code",
    "City",
    "Country",
  ],
  dataCollectionMandatoryColumnNames: [
    "First Name",
    "Email",
    "Phone",
    "Country",
  ],

  mappingColumnNames: {
    "First Name": "firstName",
    "Last Name": "lastName",
    Email: "email",
    Phone: "phone",
    "Job Title": "jobTitle",
    Department: "department",
    Company: "company",
    Street: "street",
    "Zip Code": "zipCode",
    City: "city",
    Country: "country",
  },
};

module.exports = {
  fileInfo,
};
