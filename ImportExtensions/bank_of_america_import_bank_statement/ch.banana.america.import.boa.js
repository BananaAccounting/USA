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

// @id = ch.banana.america.import.boa
// @api = 1.0
// @pubdate = 2025-10-19
// @publisher = Banana.ch SA
// @description = Bank of America - Import account statement .csv (Banana+ Advanced)
// @description.it = Bank of America - Importa movimenti .csv (Banana+ Advanced)
// @description.en = Bank of America - Import account statement .csv (Banana+ Advanced)
// @description.de = Bank of America - Bewegungen importieren .csv (Banana+ Advanced)
// @description.fr = Bank of America - Importer mouvements .csv (Banana+ Advanced)
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

   // Bank of America Format, this format works with the header names.
   var bankOfAmericaFormat1 = new BankOfAmericaFormat1();
   let transactionsData = bankOfAmericaFormat1.getFormattedData(transactions, importUtilities);
   if (bankOfAmericaFormat1.match(transactionsData)) {
      transactions = bankOfAmericaFormat1.convert(transactionsData);
      return Banana.Converter.arrayToTsv(transactions);
   }

   // Format is unknow, return an error
   importUtilities.getUnknownFormatError();

   return "";
}

/**
 * Bank of America Format
 *
 * Description,,Summary Amt.
 * Beginning balance as of 01/15/2025,,"100.00"
 * Total credits,,"2,000.00"
 * Total debits,,"-1,336.39"
 * Ending balance as of 8/16/2025,,"763.61"
 * 
 * Date,Description,Amount,Running Bal.
 * 08/01/2025,Beginning balance,,"100.00"
 * 08/12/2025,"Test","-23.02","76.98"
 * 08/13/2025,"Test","2,000.00","2,076.98"
 * 08/18/2025,"Test","-66.38","2,010.60"
 * 08/18/2025,"Test","-6.52","2,004.08"
*/
function BankOfAmericaFormat1() {

   /** Return true if the transactions match this format */
   this.match = function (transactionsData) {
      if (transactionsData.length === 0)
         return false;

      for (var i = 0; i < transactionsData.length; i++) {
         var transaction = transactionsData[i];
         var formatMatched = true;

         if (formatMatched && transaction["Date"] && transaction["Date"].length >= 10 &&
            transaction["Date"].match(/^\d{2}\/\d{2}\/\d{4}$/) && transaction["Amount"] && transaction["Amount"].length > 0)
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
            transactionsData[i]["Date"].match(/^\d{2}\/\d{2}\/\d{4}$/) && transactionsData[i]["Amount"] && transactionsData[i]["Amount"].length > 0) {
            transactionsToImport.push(this.mapTransaction(transactionsData[i]));
         }
      }

      // Add header and return
      var header = [["Date", "DateValue", "Doc", "ExternalReference", "Description", "Income", "Expenses"]];
      return header.concat(transactionsToImport);
   }

   this.getFormattedData = function (inData, importUtilities) {
      var columns = importUtilities.getHeaderData(inData, 6); //array
      var rows = importUtilities.getRowData(inData, 7); //array of array
      let form = [];

      importUtilities.loadForm(form, columns, rows);
      return form;
   }

   this.mapTransaction = function (transaction) {
      let mappedLine = [];

      mappedLine.push(Banana.Converter.toInternalDateFormat(transaction["Date"], "mm.dd.yyyy"));
      mappedLine.push(Banana.Converter.toInternalDateFormat("", "dd.mm.yyyy"));
      mappedLine.push("");
      mappedLine.push("");
      mappedLine.push(transaction["Description"]);
      if (transaction["Amount"].substring(0, 1) === "-") {
         mappedLine.push("");
         mappedLine.push(Banana.Converter.toInternalNumberFormat(transaction["Amount"].substring(1), '.'));
      } else {
         mappedLine.push(Banana.Converter.toInternalNumberFormat(transaction["Amount"], '.'));
         mappedLine.push("");
      }

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
   convertionParam.headerLineStart = 6;
   convertionParam.dataLineStart = 7;

   /** SPECIFY THE COLUMN TO USE FOR SORTING
   If sortColums is empty the data are not sorted */
   convertionParam.sortColums = ["Date", "Doc"];
   convertionParam.sortDescending = false;

   return convertionParam;
}
