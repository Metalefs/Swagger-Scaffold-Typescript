const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const utils = require("./utils");

class FolderStructureGenerator {
    constructor(config) {
        this.config = config;
    }
    
    createFolderStructure(rootPath, input) {
        const lines = input.split("\n").filter((line) => !line.trim().startsWith("#") && line.trim() !== "");
        
        let folderCount = 0;
        let fileCount = 0;
        let template = "";
      
        try {    
            let workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workspacePath = workspaceFolder.uri.fsPath;
            template = require(path.join(workspacePath, '/swaggerstruct-generated-templates.json'));
        } catch(error) {
            console.error("Error in Template File:", error);
        }
      
        try {
            ({ folderCount, fileCount } = this.processStructure(rootPath, lines, template));
        } catch (error) {
            console.error("Error in createFolderStructure:", error);
            throw error;
        }
      
        return { folderCount, fileCount };
    }
    
    processStructure = (rootPath, lines, template, getDepthAndName) => {
        let folderCount = 0;
        let fileCount = 0;
        const stack = [{ path: rootPath, depth: -1 }];
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trimStart();
            const depth = line.length - trimmedLine.length;
            const name = trimmedLine.replace(/\/$/g, "");
            const [safeName, x, matchString] = name.split('\\');
            try {                
                while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
                    stack.pop();
                }
    
                const parentPath = stack[stack.length - 1].path;
                const fullPath = path.join(parentPath, this.getFileName(safeName)).trim();
    
                let replacedName = safeName;
                template.useFileName?.replacements?.forEach(replacement => {
                    replacedName = replacedName.replace(replacement.findText, replacement.replaceWith);
                });

                const templateMatch = this.getTemplateMatch(template, safeName, matchString);
                const isArray = templateMatch?.isArray || false;

                let replacedContent = '';
                if (isArray) {
                    // Format for array types
                    replacedContent = 
                        `${this.getFileImports(template, safeName, matchString)}` +
                        `export type ${utils.toPascalCase(replacedName)} = ${this.getBody(template, safeName, matchString)};`;
                } else {
                    // Format for normal interface types
                    replacedContent = template.content 
                        ? template.content
                            .replace('{{imports}}', this.getFileImports(template, safeName, matchString))
                            .replace('{{fileName}}', replacedName || '')
                            .replace('{{fileNamePascalCase}}', utils.toPascalCase(replacedName || ''))
                            .replace('{{fileNameCamelCase}}', utils.toCamelCase(replacedName || ''))
                            .replace('{{body}}', this.getBody(template, safeName, matchString)) 
                        : '';
                }
    
                if (safeName.includes(".")) {
                    fs.writeFileSync(fullPath, replacedContent);
                    fileCount++;
                } else {
                    fs.mkdirSync(fullPath, { recursive: true });
                    folderCount++;
                    stack.push({ path: fullPath, depth });
                }
            } catch (error) {
                console.error(`Error processing line ${index + 1}: ${line}`, error);
                throw error;
            }
        });
    
        return { folderCount, fileCount };
    };
      
    getFileName(fileName) {
        switch(this.config.fileNameCasing) {
            case "KebabCase": 
                return fileName;
            case "CamelCase": 
                return utils.toCamelCase(fileName);
            case "PascalCase": 
                return utils.toPascalCase(fileName);
        } 
    }

    getTemplateMatch(template, safeName, matchString) {
        return template.customTemplates?.find(item => 
            item.fileName.split('.')[0] === safeName.split('.')[0] || 
            item.match.toLowerCase().trim() === matchString?.toLowerCase().trim()
        );
    }

    getFileImports(template, safeName, matchString) {
        const match = this.getTemplateMatch(template, safeName, matchString);
        if (!match) return '';
        return match.imports;
    }
    
    getBody(template, safeName, matchString) {
        const match = this.getTemplateMatch(template, safeName, matchString);
        if (!match) return '';
        return match.body || '';
    }
    
    async generateReport(rootPath, input) {
        const reportContent = `# Folder Structure Report\n\n\`\`\`\n${input}\n\`\`\``;
        const reportPath = path.join(rootPath, "folder_structure_report.md");
        fs.writeFileSync(reportPath, reportContent);
        const uri = vscode.Uri.file(reportPath);
        await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(uri);
    }
}

module.exports = FolderStructureGenerator;