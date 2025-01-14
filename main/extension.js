const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function activate(context) {      
  let workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspacePath = workspaceFolder.uri.fsPath;
  let config = {};

  try{
    config = require(path.join(workspacePath, '/swaggerstruct.config.json'))
  }
  catch(ex){
    config = {
      fileNameCasing: "KebabCase",
      separateFoldersRequestAndResponse: false,
      methodPrefixes: {
        GET: "get",
        POST: "create",
        PUT: "update",
        PATCH: "patch",
        DELETE: "delete"
      }
    }
  }

  let scrapeSwaggerCommand = vscode.commands.registerCommand("extension.swaggerScaffold", async function () {    
    // Get the workspace folder
    
    if (!workspaceFolder) {
        throw new Error('No workspace folder found. Please open a folder first.');
    }

    // Get swagger address from user
    const swaggerAddress = await vscode.window.showInputBox({
        prompt: 'Enter Swagger v1 Address',
        placeHolder: 'https://example.com/swagger/swagger.json'
    });
    
    if (!swaggerAddress || swaggerAddress.length === 0) {
      vscode.window.showInformationMessage("Invalid Swagger Address");
      return;
    }

    vscode.window.showInformationMessage(`Processing swagger at: ${swaggerAddress}`);
    
    try {
      const swaggerParser = new (require('./swagger-parser'))(config);
      const swaggerData = await swaggerParser.parseSwaggerUrl(swaggerAddress);
      const result = await swaggerParser.processSwaggerData(swaggerData);
      
      // result will contain:
      // - folderPattern: The folder structure pattern
      // - templatePattern: The template pattern with customTemplates
      
      // Create the files
      await vscode.workspace.fs.writeFile(
          vscode.Uri.file(path.join(workspacePath, 'swaggerstruct-generated-folder-structure.yaml')),
          Buffer.from(result.folderPattern)
      );
      
      await vscode.workspace.fs.writeFile(
          vscode.Uri.file(path.join(workspacePath, 'swaggerstruct-generated-templates.json')),
          Buffer.from(JSON.stringify(result.templatePattern, null, 2))
      );

      vscode.window.showInformationMessage('Successfully parsed Swagger documentation');
      vscode.window.showInformationMessage("Swagger processing completed successfully");

      // Generate interfaces for all schemas
      const interfaces = swaggerParser.generateSchemaInterfaces(swaggerData.data);
      
      // Create a directory for the interfaces
      const interfacesDir = path.join(workspacePath, 'interfaces');
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(interfacesDir));
      
      // Write each interface to a file
      for (const [name, details] of interfaces) {
          const interfaceContent = `${details.imports}\nexport ${(details.type === 0) ? 'interface' : 'enum'} ${name} ${details.definition}`;
          await vscode.workspace.fs.writeFile(
              vscode.Uri.file(path.join(interfacesDir, `${name}.ts`)),
              Buffer.from(interfaceContent)
          );
      }

    } catch (error) {
      console.error("Full error object:", error);
      vscode.window.showErrorMessage(`Error processing swagger: ${error.message}`);
    }
  });

  let processCommand = vscode.commands.registerCommand("extension.processFolderStructure", async function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    try {
      let workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : undefined;

      const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Folder",
        defaultUri: workspaceFolder,
      });
      const rootPath = folderUri[0].fsPath;

      if (!folderUri || folderUri.length === 0) {
        vscode.window.showInformationMessage("Folder selection cancelled");
        return;
      }
      const input = editor.document.getText();

      const folderStructureGenerator = new (require('./folder-structure-generator'))(config);

      const { folderCount, fileCount } = folderStructureGenerator.createFolderStructure(rootPath, input);

      const message = `Folder structure created successfully!\n${folderCount} folders and ${fileCount} files were created.`;
      const action = await vscode.window.showInformationMessage(message, "Open Folder", "Generate Report");

      if (action === "Open Folder") {
        let uri = vscode.Uri.file(rootPath);
        await vscode.commands.executeCommand("vscode.openFolder", uri);
      } else if (action === "Generate Report") {
        await folderStructureGenerator.generateReport(rootPath, input);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error creating folder structure: ${error.message}`);
      console.error("Full error:", error);
    }
  });

  context.subscriptions.push(processCommand, scrapeSwaggerCommand);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
