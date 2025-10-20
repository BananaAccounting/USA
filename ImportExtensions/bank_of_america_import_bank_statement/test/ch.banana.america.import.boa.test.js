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
//


// @id = ch.banana.america.import.boa.test
// @api = 1.0
// @pubdate = 2023-02-07
// @publisher = Banana.ch SA
// @description = <TEST ch.banana.america.import.boa.test>
// @task = app.command
// @doctype = *.*
// @docproperties = 
// @outputformat = none
// @inputdataform = none
// @includejs = ../ch.banana.america.import.boa.sbaa/import.utilities.js
// @includejs = ../ch.banana.america.import.boa.sbaa/ch.banana.america.import.boa.js
// @timeout = -1

// Register test case to be executed
Test.registerTestCase(new TestImportBoa());

// Here we define the class, the name of the class is not important
function TestImportBoa() {
}

// This method will be called at the beginning of the test case
TestImportBoa.prototype.initTestCase = function() {
   this.testLogger = Test.logger;
   this.progressBar = Banana.application.progressBar;
}

// This method will be called at the end of the test case
TestImportBoa.prototype.cleanupTestCase = function() {

}

// This method will be called before every test method is executed
TestImportBoa.prototype.init = function() {

}

// This method will be called after every test method is executed
TestImportBoa.prototype.cleanup = function() {

}

TestImportBoa.prototype.testImport = function() {
   var fileNameList = [];

   fileNameList.push("file:script/../test/testcases/csv_boa_example_format1_20250801.csv");
   
   var parentLogger = this.testLogger;
   this.progressBar.start(fileNameList.length);

   for (var i = 0; i < fileNameList.length; i++) {
      var fileName = fileNameList[i];
      this.testLogger = parentLogger.newLogger(Banana.IO.fileCompleteBaseName(fileName));

      var file = Banana.IO.getLocalFile(fileName);
      Test.assert(file);
      var fileContent = file.read();
      Test.assert(fileContent);
      var transactions = exec(fileContent,true); //takes the exec from the import script.
      this.testLogger.addCsv('', transactions);
      
      if (!this.progressBar.step())
         break;
   }

   this.progressBar.finish();
}