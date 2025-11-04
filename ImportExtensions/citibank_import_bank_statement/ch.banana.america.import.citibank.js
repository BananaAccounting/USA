// Copyright [2025] [Banana.ch SA - Lugano Switzerland]
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// @id = ch.banana.america.import.citibank
// @api = 1.0
// @pubdate = 2025-11-04
// @publisher = Banana.ch SA
// @description = Citibank - Import account statment .csv (Banana+ Advanced)
// @description.it = Citibank - Importa movimenti .csv (Banana+ Advanced)
// @description.en = Citibank - Import account statment .csv (Banana+ Advanced)
// @description.de = Citibank - Bewegungen importieren .csv (Banana+ Advanced)
// @description.fr = Citibank - Importer mouvements .csv (Banana+ Advanced)
// @doctype = *
// @docproperties =
// @task = import.transactions
// @outputformat = transactions.simple
// @inputdatasource = openfiledialog
// @inputencoding = utf-8
// @inputfilefilter = Text files (*.txt *.csv);;All files (*.*)
// @inputfilefilter.de = Text (*.txt *.csv);;Alle Dateien (*.*)
// @inputfilefilter.fr = Texte (*.txt *.csv);;Tous (*.*)
// @inputfilefilter.it = Testo (*.txt *.csv);;Tutti i files (*.*)
// @timeout = -1
// @includejs = import.utilities.js

/**
 * Parse the data and return the data to be imported as a tab separated file.
 */
function exec(string, isTest) {

   var importUtilities = new ImportUtilities(Banana.document);

   if (isTest !== true && !importUtilities.verifyBananaAdvancedVersion())
      return "";

   let convertionParam = defineConversionParam(string);

   var transactions = Banana.Converter.csvToArray(string, convertionParam.separator, '"');

   // Citibank Format 2, this format works for business accounts.
   var citibankFormat2 = new CitibankFormat2();
   let transactionsData = citibankFormat2.getFormattedData(transactions, importUtilities);
   if (citibankFormat2.match(transactionsData)) {
      transactions = citibankFormat2.convert(transactionsData);
      return Banana.Converter.arrayToTsv(transactions);
   }

   // Citibank Format, this format works for individual accounts.
   var citibankFormat1 = new CitibankFormat1();
   transactionsData = citibankFormat1.getFormattedData(transactions, importUtilities);
   if (citibankFormat1.match(transactionsData)) {
      transactions = citibankFormat1.convert(transactionsData);
      return Banana.Converter.arrayToTsv(transactions);
   }

   // Format is unknow, return an error
   importUtilities.getUnknownFormatError();

   return "";
}

/**
 * Citibank Format 2
 * This format concerns business account statements exported from Citibank online banking in CSV format.
 * 
 * DATE,TRANSACTION TYPE,DESCRIPTION,AMOUNT (USD),BALANCE (USD)
 * 2025-10-28,Debit,TEST,-59.09,,
 * 2025-10-28,Debit,TEST,-53.95,,
 * 2025-10-28,Debit,TEST,-33.00,,
 * 2025-10-28,Debit,TEST,-25.63,,
 * 2025-10-24,ACH,TEST,-11088.26,,
 * 2025-10-24,ACH,TEST,-72.97,,
 */
function CitibankFormat2() {
   /** Return true if the transactions match this format */
   this.match = function (transactionsData) {
      if (transactionsData.length === 0)
         return false;

      for (var i = 0; i < transactionsData.length; i++) {
         var transaction = transactionsData[i];
         var formatMatched = false;

         if (transaction["DATE"] && transaction["DATE"].length >= 10 &&
            transaction["DATE"].match(/^\d{2,4}-\d{2}-\d{2,4}$/))
            formatMatched = true;
         else
            formatMatched = false;

         if (formatMatched && transaction["TRANSACTION TYPE"] !== undefined)
            formatMatched = true;
         else
            formatMatched = false;

         if (formatMatched)
            return true;
      }

      return false;
   }

   this.convert = function (transactionsData) {
      var transactionsToImport = [];

      for (var i = 0; i < transactionsData.length; i++) {
         if (transactionsData[i]["DATE"] && transactionsData[i]["DATE"].length >= 10 &&
            transactionsData[i]["DATE"].match(/^\d{2,4}-\d{2}-\d{2,4}$/)) {
            transactionsToImport.push(this.mapTransaction(transactionsData[i]));
         }
      }

      // Sort rows by date
      transactionsToImport = transactionsToImport.reverse();

      // Add header and return
      var header = [["Date", "DateValue", "Doc", "ExternalReference", "Description", "Income", "Expenses"]];
      return header.concat(transactionsToImport);
   }

   this.getFormattedData = function (inData, importUtilities) {
      // Create a deep copy of inData to avoid modifying the original data
      let inDataCopy = JSON.parse(JSON.stringify(inData));
      var columns = importUtilities.getHeaderData(inDataCopy, 0); //array
      var rows = importUtilities.getRowData(inDataCopy, 1); //array of array
      let form = [];

      importUtilities.loadForm(form, columns, rows);
      return form;
   }

   this.mapTransaction = function (transaction) {
      let mappedLine = [];

      mappedLine.push(Banana.Converter.toInternalDateFormat(transaction["DATE"], "yyyy-mm-dd"));
      mappedLine.push(Banana.Converter.toInternalDateFormat("", "dd.mm.yyyy"));
      mappedLine.push("");
      mappedLine.push("");
      mappedLine.push(this.getDescription(transaction));
      let amount = Banana.Converter.toInternalNumberFormat(transaction["AMOUNT (USD)"], '.');
      if (amount.substring(0, 1) === "-") {
         mappedLine.push("");
         mappedLine.push(Banana.Converter.toInternalNumberFormat(amount.substring(1), '.'));
      } else {
         mappedLine.push(Banana.Converter.toInternalNumberFormat(amount, '.'));
         mappedLine.push("");
      }

      return mappedLine;
   }

   this.getDescription = function (transaction) {
      if (!transaction) return "";
      const { "TRANSACTION TYPE": type, "DESCRIPTION": description } = transaction;
      return [type, description]
         .filter(value => value && typeof value === "string" && value.trim() !== "")
         .join(", ");
   }
}

/**
 * Citibank Format 1
 * This format concerns individual account statements exported from Citibank online banking in CSV format.
 * 
 * Status,Date,Description,Debit,Credit
 * Cleared,10-16-2025,"Test",4530.00,,
 * Cleared,10-16-2025,"Test",1000.00,,
 * Cleared,10-15-2025,"Test",,18282.76,
 * Cleared,10-15-2025,"Test",12.71,,
 * Cleared,10-14-2025,"Test",4336.99,,
*/
function CitibankFormat1() {

   /** Return true if the transactions match this format */
   this.match = function (transactionsData) {
      if (transactionsData.length === 0)
         return false;

      for (var i = 0; i < transactionsData.length; i++) {
         var transaction = transactionsData[i];
         var formatMatched = false;

         if (transaction["Date"] && transaction["Date"].length >= 10 &&
            transaction["Date"].match(/^\d{2}-\d{2}-\d{4}$/))
            formatMatched = true;
         else
            formatMatched = false;

         if (formatMatched && transaction["Status"] !== undefined)
            formatMatched = true;
         else
            formatMatched = false;

         if (formatMatched)
            return true;
      }

      return false;
   }

   this.convert = function (transactionsData) {
      var transactionsToImport = [];

      for (var i = 0; i < transactionsData.length; i++) {
         if (transactionsData[i]["Date"] && transactionsData[i]["Date"].length >= 10 &&
            transactionsData[i]["Date"].match(/^\d{2}-\d{2}-\d{4}$/)) {
            transactionsToImport.push(this.mapTransaction(transactionsData[i]));
         }
      }

      // Sort rows by date
      transactionsToImport = transactionsToImport.reverse();

      // Add header and return
      var header = [["Date", "DateValue", "Doc", "ExternalReference", "Description", "Income", "Expenses"]];
      return header.concat(transactionsToImport);
   }

   this.getFormattedData = function (inData, importUtilities) {
      // Create a deep copy of inData to avoid modifying the original data
      let inDataCopy = JSON.parse(JSON.stringify(inData));
      var columns = importUtilities.getHeaderData(inDataCopy, 0); //array
      var rows = importUtilities.getRowData(inDataCopy, 1); //array of array
      let form = [];

      importUtilities.loadForm(form, columns, rows);
      return form;
   }

   this.mapTransaction = function (transaction) {
      let mappedLine = [];

      mappedLine.push(Banana.Converter.toInternalDateFormat(transaction["Date"], "mm-dd-yyyy"));
      mappedLine.push(Banana.Converter.toInternalDateFormat("", "dd.mm.yyyy"));
      mappedLine.push("");
      mappedLine.push("");
      mappedLine.push(transaction["Description"]);

      mappedLine.push(Banana.Converter.toInternalNumberFormat(transaction["Credit"], '.'));
      mappedLine.push(Banana.Converter.toInternalNumberFormat(transaction["Debit"], '.'));

      return mappedLine;
   }
}

function defineConversionParam(inData) {

   var inData = Banana.Converter.csvToArray(inData);
   var header = String(inData[0]);
   var convertionParam = {};
   /** SPECIFY THE SEPARATOR AND THE TEXT DELIMITER USED IN THE CSV FILE */
   convertionParam.format = "csv"; // available formats are "csv", "html"
   //get text delimiter
   convertionParam.textDelim = '"';
   // get separator
   if (header.indexOf(';') >= 0) {
      convertionParam.separator = ';';
   } else {
      convertionParam.separator = ',';
   }

   /** SPECIFY AT WHICH ROW OF THE CSV FILE IS THE HEADER (COLUMN TITLES)
   We suppose the data will always begin right away after the header line */
   convertionParam.headerLineStart = 0;
   convertionParam.dataLineStart = 1;

   /** SPECIFY THE COLUMN TO USE FOR SORTING
   If sortColums is empty the data are not sorted */
   convertionParam.sortColums = ["Date", "Doc"];
   convertionParam.sortDescending = false;

   return convertionParam;
}
