# SwaggerScaffold: Folder & File Generator

**SwaggerScaffold** is a powerful VS Code extension that automates the generation of folder structures and request/response files from a Swagger (OpenAPI) address. This tool simplifies API integration by converting API definitions into code scaffolding, enabling developers to quickly start building around defined routes.

### Warning: The command only works within an active workspace in VSCode

## Features

- 🔄 **Generate Folder Structures**: Automatically creates folder structures based on your Swagger API definitions.
- 📄 **Request/Response File Creation**: Generates request and response files for each API endpoint.
- 🌐 **Swagger Integration**: Fetches API routes directly from a Swagger (OpenAPI) address and translates them into code.
- 🛠 **Customizable Templates**: Generates a template file to customize the structure and content of the generated files.
- 🛠 **Supports Enum Files with x-enumNames**: Generates files for named enums.
- 🚀 **Fast and Easy Setup**: Quickly scaffold your projects without manually writing boilerplate code.

## Installation

1. Open VS Code.
2. Navigate to the Extensions panel on the sidebar.
3. Search for `SwaggerScaffold` and click "Install."
4. Reload VS Code if necessary. 

## Usage

# Generating base structure

1. **Open Command Palette** (`Ctrl + Shift + P` or `Cmd + Shift + P` on macOS).
2. Search for `SwaggerScaffold: Generate API Structure`.
3. Enter the Swagger (OpenAPI) URL.
4. The extension will generate directory structure and template files automatically based on the provided Swagger address.

### Review & Finalize Scaffolded Files

1. After the initial generation, **analyze the scaffolded files** to ensure they meet your project’s requirements.
2. Once you’ve made any necessary adjustments, open `swaggerstruct-generated-folder-structure.yaml` then **run the command** `Process Folder Structure` from the Command Palette to ensure the files are scaffolded correctly.

# Scaffolding files

1. With `swaggerstruct-generated-folder-structure.yaml` open.
2. **Open Command Palette** (`Ctrl + Shift + P` or `Cmd + Shift + P` on macOS).
3. Search for `SwaggerScaffold: Process Folder Structure`.
4. Select the desired output folder.
5. The extension will generate folder structures and request/response files automatically based on the provided structure and template files generated in the workspace root path.
---


## Example

Given a Swagger URL, SwaggerStruct will generate:

- `/users/`  
  - `GetUserRequest.ts`
  - `GetUserResponse.ts`
- `/posts/`  
  - `CreatePostRequest.ts`
  - `CreatePostResponse.ts`
 

## Configuration

To fully customize file generation, you can create a `swaggerstruct.config.json` file in your project directory. This configuration file gives you control over how the generated files are named and how HTTP method-specific prefixes are applied for the scaffolded files.

### Available Configuration Options

#### 1. **File Name Casing**
You can configure the casing of generated filenames using one of the following options:
- **PascalCase**: Each word starts with an uppercase letter (e.g., `CreateUserRequest`).
- **CamelCase**: The first word starts with a lowercase letter, and each subsequent word starts with an uppercase letter (e.g., `createUserRequest`).
- **KebabCase**: Words are separated by hyphens and all letters are lowercase (e.g., `create-user-request`).

#### 2. **Change Prefix per HTTP Method**
You can define prefixes based on the HTTP methods used in the Swagger API, making it easy to distinguish between different types of requests:
- **GET**: Commonly prefixed with something like `Get`.
- **POST**: Prefixed with `Create` or `Post`.
- **PUT**: Prefixed with `Update`.
- **DELETE**: Prefixed with `Delete`.

This allows you to control how request and response files are named according to the HTTP method used.

### Example `swaggerstruct.config.json`:

```json
{
  "fileNameCasing": "KebabCase",
  "separateFoldersRequestAndResponse": false,
  "methodPrefixes": {
    "GET": "get",
    "POST": "create",
    "PUT": "update",
    "PATCH": "patch",
    "DELETE": "delete"
  }
}
```

### Explanation:

- **File Name Casing**: The `fileNameCasing` is set to `PascalCase`, meaning all generated files will have names like `GetUserRequest.ts` or `CreatePostResponse.ts`. (Default is KebabCase)
  
- **HTTP Method Prefixes**: 
  - For **GET** requests, the prefix is `Get`. So, for an API route like `/users`, the generated request file will be `GetUserRequest.ts`.
  - For **POST** requests, the prefix is `Create`. For `/posts`, the request file will be `CreatePostRequest.ts`.
  - **PUT** requests will have the prefix `Update`, and **DELETE** requests will have the prefix `Delete`.

### How it Works

When you run the SwaggerStruct command with this configuration:
- The tool will generate a `swaggerstruct-generated-folder-structure.yaml` file, defining `users/get-user-request.ts` for `GET /users` and `posts/create-post-response.ts` for `POST /posts`.
- The tool will generate a `swaggerstruct-generated-templates.json` file containing the request and response bodies for each endpoint/file.
- File names will follow the `KebabCase` format, with the appropriate method-based prefixes and file extension.
- The content inside these files will be based on your custom template, using the generated `swaggerstruct-generated-templates.json` to replace text as defined in the request and response templates.

## Custom Templates
To customize file generation, change the generated `swaggerstruct-generated-templates.json` file. You can configure:

1. File naming conventions.
2. Custom content using available placeholders: {{fileName}}, {{body}}, {{fileNamePascalCase}} and {{fileNameCamelCase}}.
3. Different file templates for requests, responses, or specific endpoints.

### Example `swaggerstruct-generated-templates.json`:

```json
{
  "content": "{{imports}} export interface {{fileNamePascalCase}} {{body}}",
  "useFileName": {
    "replacements": [
      {
        "findText": ".request.ts",
        "replaceWith": "RequestDto"
      },
      {
        "findText": ".response.ts",
        "replaceWith": "ReponseDto"
      }
    ]
  },
  "customTemplates": {
    "fileName": "create-some-route.request.ts",
    "body": "{/n}",
    "match": "get-request-/api/v1/azure",
    "imports": "import { ReferenceDTO } from '../interfaces'"
  }
}
```

## Contribution

Feel free to open issues, submit pull requests, or suggest features. Contributions are welcome!

---
