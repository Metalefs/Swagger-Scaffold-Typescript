const axios = require('axios');
const { URL } = require('url');
const vscode = require('vscode');
const { parse } = require('node-html-parser');
const utils = require("./utils");

class SwaggerParser {
    constructor(config) {
        this.config = config;
        this.axios = axios.create({
            timeout: 10000
        });
    }

    async parseSwaggerUrl(url) {
        try {
            // Validate URL
            new URL(url);

            // Try to fetch as JSON first
            console.log('Fetching data')
            const response = await this.axios.get(url);
            const contentType = response.headers['content-type'];
            
            if (contentType?.includes('json')) {
                return {
                    type: 'json',
                    data: response.data
                };
            } else {
                throw new Error('Unsupported content type: ' + contentType);
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Could not connect to the specified URL');
            }
            if (error.response?.status === 404) {
                throw new Error('Swagger documentation not found at specified URL');
            }
            throw new Error(`Failed to parse Swagger: ${error.message}`);
        }
    }

    async processSwaggerData(swaggerData) {
        try {
            const { type, data } = swaggerData;

            if (type === 'json') {
                return this.processJsonSwagger(data);
            }
            throw new Error('Unsupported swagger data type');
        } catch (error) {
            throw new Error(`Failed to process Swagger data: ${error.message}`);
        }
    }

    processJsonSwagger(json) {
        const endpoints = [];
        const paths = json.paths || {};
    
        // Process paths into endpoints
        for (const [path, methods] of Object.entries(paths)) {
            for (const [method, details] of Object.entries(methods)) {
                const folderName = this.getFolderNameFromPath(path);

                const requestBody = this.extractRequestSchema(details, json);
                const responseBody = this.extractResponseSchema(details, json);

                let fileName = this.getFileNameFromPath(path, method)+`\\${method}-${path}`;
                
                endpoints.push({
                    path,
                    method,
                    summary: details.summary || '',
                    description: details.description || '',
                    requestBody,
                    responseBody,
                    folderName,
                    fileName,
                    safeName: this.getFileNameFromPath(path, method),
                    tags: details.tags || [],
                    operation: details
                });
            }
        }
    
        // Create the output in the desired format
        const organized = this.organizeEndpoints(endpoints);    
        const folderPattern = this.createFolderPattern(organized);
        const templatePattern = this.createTemplatePattern(organized);
    
        return {
            folderPattern,
            templatePattern
        };
    }
    
    getFolderNameFromPath(path) {
        const parts = path.split('/').filter(p => p);
        // Get the first meaningful segment after /api/v1/
        const apiIndex = parts.findIndex(p => p === 'api');
        if (apiIndex !== -1 && parts[apiIndex + 1] === 'v1') {
            return parts[apiIndex + 2] || 'default';
        }
        return parts[0] || 'default';
    }
    
    getFileNameFromPath(path, method) {
        const parts = path.split('/').filter(p => p);
        let fileName = parts[parts.length - 1];
        const methodPrefix = this.getMethodPrefix(method);
       
        // If the last part is a parameter
        if (fileName.startsWith('{') && fileName.endsWith('}')) {
            // Get the base name (part before the parameter)
            const baseName = parts[parts.length - 2];
            fileName = baseName;
            
            // Collect all parameters in the path
            const parameters = parts
                .filter(part => part.startsWith('{') && part.endsWith('}'))
                .map(param => param.slice(1, -1));
                
            // Add each parameter to the filename
            if (parameters.length > 0) {
                const parameterSuffix = parameters
                    .map(param => `by-${param}`)
                    .join('-');
                fileName = `${fileName}-${parameterSuffix}`;
            }
        }
        
        return methodPrefix+fileName;
    }

    getMethodPrefix(method){
        switch(method.toLowerCase()){
            case "get": 
                return  this.config.methodPrefixes.GET+'-';
            case "post": 
                return  this.config.methodPrefixes.POST+'-';
            case "put": 
                return  this.config.methodPrefixes.PUT+'-';
            case "patch": 
                return  this.config.methodPrefixes.PATCH+'-';
            case "delete": 
                return  this.config.methodPrefixes.DELETE+'-';
            default:
                return  '';
        } 
    }
    
    extractRequestSchema(details, swagger) {
        if(!details.requestBody) return null;
        const schema = details.requestBody?.content?.['application/json']?.schema;
        return this.resolveSchema(schema, swagger) || '';
    }
    
    extractResponseSchema(details, swagger) {
        const successResponse = details.responses?.['200'] || details.responses?.['201'];
        const schema = successResponse?.content?.['application/json']?.schema;
        return this.resolveSchema(schema, swagger) || '';
    }

    generateSchemaInterfaces(swagger) {
        const interfaces = new Map();
        
        if (swagger.components?.schemas) {
            for (const [name, schema] of Object.entries(swagger.components.schemas)) {
                const interfaceImports = this.schemaImports(schema);
                const interfaceDefinition = this.schemaToTypeScript(schema);
                interfaces.set(name, {imports: interfaceImports, definition: interfaceDefinition});
            }
        }
        
        return interfaces;
    }
    
    resolveSchema(schema, swagger) {
        if (!schema) return '';
    
        // If it's a reference, resolve it
        if (schema.$ref) {
            const refPath = schema.$ref.split('/');
            const refName = refPath[refPath.length - 1];
            return refName;
        }
        
        // Handle array with reference items
        if (schema.type === 'array' && schema.items?.$ref) {
            const refPath = schema.items.$ref.split('/');
            const refName = refPath[refPath.length - 1];
            return `${refName}[]`;
        }
        
        // If it's a direct schema, convert it to TypeScript
        return this.schemaToTypeScript(schema, swagger);
    }

    schemaToTypeScript(schema, swagger) {
        if (!schema) return '';
        
        let result = '{\n';
        if (schema.properties) {
            for (const [prop, details] of Object.entries(schema.properties)) {
                const isRequired = schema.required?.includes(prop);
                const propertyName = `${prop}${isRequired ? '' : '?'}`;
                
                let propertyType;
                if (details.$ref) {
                    // Handle direct references
                    const refName = details.$ref.split('/').pop();
                    propertyType = refName;
                } else if (details.type === 'array' && details.items?.$ref) {
                    // Handle array of references
                    const refName = details.items.$ref.split('/').pop();
                    propertyType = `${refName}[]`;
                } else {
                    // Handle primitive types
                    propertyType = this.getTypeScriptType(details);
                }
                
                result += `  ${propertyName}: ${propertyType};\n`;
            }
        }
        result += '}';
        return result;
    }

    schemaImports(schema) {
        if (!schema) return '';
        // Convert schema to TypeScript interface string
        let imports = ``;
        if (schema.properties) {
            for (const [prop, details] of Object.entries(schema.properties)) {
                if(details['$ref'] || details.items?.$ref) {
                    const filename = (details['$ref'] || details.items?.$ref).split('/').at(-1);
                    imports += `import {${filename}} from "./${filename}";\n`;
                }
            }
        }
        return imports;
    }
    
    getTypeScriptType(property) {
        if (property.$ref) {
            return property.$ref.split('/').pop();
        }
        
        switch (property.type) {
            case 'string':
                if (property.enum) {
                    return property.enum.map(e => `'${e}'`).join(' | ');
                }
                return 'string';
            case 'integer':
            case 'number':
                return 'number';
            case 'boolean':
                return 'boolean';
            case 'array':
                if (property.items?.$ref) {
                    const refType = property.items.$ref.split('/').pop();
                    return `${refType}[]`;
                }
                return `${this.getTypeScriptType(property.items)}[]`;
            case 'object':
                if (property.additionalProperties) {
                    const valueType = this.getTypeScriptType(property.additionalProperties);
                    return `Record<string, ${valueType}>`;
                }
                return 'Record<string, any>';
            default:
                return 'any';
        }
    }

    organizeEndpoints(endpoints) {
        const organized = {};
        
        endpoints.forEach(endpoint => {
            const folder = endpoint.folderName;
            if (!organized[folder]) {
                organized[folder] = [];
            }
            organized[folder].push(endpoint);
        });
    
        return organized;
    }
    
    createFolderPattern(organized) {
        let pattern = '';
        let requestsPattern = 'request/\n';
        let responsesPattern = 'response/\n';

        for (const [folder, endpoints] of Object.entries(organized)) {
            pattern += `${folder}/\n`;            
            if(this.config.separateFoldersRequestAndResponse){
                requestsPattern += `    ${folder}/\n`;
                responsesPattern += `    ${folder}/\n`;
            }

            endpoints.forEach(endpoint => {
                if(endpoint.requestBody){
                    pattern += `    #${endpoint.method} - ${endpoint.path} - ${endpoint.summary.replace(/(\r\n|\n|\r)/gm, "")}\n`;
                    pattern += `    ${endpoint.safeName}.request.ts\\${endpoint.method}-${endpoint.path}\n`;

                     if(this.config.separateFoldersRequestAndResponse){
                        requestsPattern += `    #${endpoint.method} - ${endpoint.path} - ${endpoint.summary.replace(/(\r\n|\n|\r)/gm, "")}\n`;
                        requestsPattern += `    ${endpoint.safeName}.request.ts\\${endpoint.method}-${endpoint.path}\n`;
                    }
                }
                if(endpoint.responseBody){
                    pattern += `    #${endpoint.method} - ${endpoint.path} - ${endpoint.summary.replace(/(\r\n|\n|\r)/gm, "")}\n`;
                    pattern += `    ${endpoint.safeName}.response.ts\\${endpoint.method}-${endpoint.path}\n`;

                     if(this.config.separateFoldersRequestAndResponse){
                        responsesPattern += `    #${endpoint.method} - ${endpoint.path} - ${endpoint.summary.replace(/(\r\n|\n|\r)/gm, "")}\n`;
                        responsesPattern += `    ${endpoint.safeName}.response.ts\\${endpoint.method}-${endpoint.path}\n`;
                    }
                }
            });
        }
    
        if(this.config.separateFoldersRequestAndResponse){
            return `${requestsPattern}${responsesPattern}`
        }
        else return pattern;
    }    
    
    createTemplatePattern(organized) {
        const customTemplates = [];
        
        for (const [folder, endpoints] of Object.entries(organized)) {
            endpoints.forEach(endpoint => {
                if(endpoint.requestBody) {
                    const isArray = endpoint.requestBody.endsWith('[]');
                    const baseType = isArray ? endpoint.requestBody.slice(0, -2) : endpoint.requestBody; 
                    const schema = endpoint.operation?.requestBody?.content?.['application/json']?.schema;
                    const isRef = schema.$ref||schema.items?.$ref;
                    let body = endpoint.requestBody;

                    if (isRef && !isArray) {
                        body = `extends ${body} {}`
                    }

                    customTemplates.push({
                        fileName: `${endpoint.safeName}.request.ts`,
                        body,
                        match: `${endpoint.method.toLowerCase()}-${endpoint.path}`,
                        imports: isArray ? 
                            `import { ${baseType} } from '../../interfaces/${baseType}';\n` : 
                            isRef ? `import { ${endpoint.requestBody} } from "../../interfaces/${endpoint.requestBody}";\n` : '',
                        isArray
                    });
                }
                
                if(endpoint.responseBody) {
                    const isArray = endpoint.responseBody.endsWith('[]');
                    const baseType = isArray ? endpoint.responseBody.slice(0, -2) : endpoint.responseBody;
                    const successResponse = endpoint.operation?.responses?.['200'] || endpoint.operation.responses?.['201'];
                    const schema = successResponse?.content?.['application/json']?.schema;
                    const isRef = schema.$ref||schema.items?.$ref;
                    let body = endpoint.responseBody;

                    if (isRef && !isArray) {
                        body = `extends ${body} {}`
                    }

                    customTemplates.push({
                        fileName: `${endpoint.safeName}.response.ts`,
                        body,
                        match: `${endpoint.method.toLowerCase()}-${endpoint.path}`,
                        imports: isArray ? 
                            `import { ${baseType} } from '../../interfaces/${baseType}';\n` : 
                            isRef ? `import { ${endpoint.responseBody} } from "../../interfaces/${endpoint.responseBody}";\n` : '',
                        isArray
                    });
                }
            });
        }
        
        return {
            content: `{{imports}}export interface {{fileNamePascalCase}} {{body}}`,
            useFileName: {
                replacements: [
                    {
                        findText: ".request.ts",
                        replaceWith: "RequestDto"
                    },
                    {
                        findText: ".response.ts",
                        replaceWith: "ReponseDto"
                    }
                ],
            },
            customTemplates
        };
    }
}

module.exports = SwaggerParser;