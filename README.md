# SwaggerScaffold: Folder & File Generator

**SwaggerScaffold** is a powerful VS Code extension that automates the generation of folder structures and request/response files from a Swagger (OpenAPI) address. This tool simplifies API integration by converting API definitions into code scaffolding, enabling developers to quickly start building around defined routes.

## Features

- 🔄 **Generate Folder Structures**: Automatically creates folder structures based on your Swagger API definitions.
- 📄 **Request/Response File Creation**: Generates request and response files for each API endpoint.
- 🌐 **Swagger Integration**: Fetches API routes directly from a Swagger (OpenAPI) address and translates them into code.
- 🛠 **Customizable Templates**: Generates a `template.json` file to customize the structure and content of the generated files.
- 🚀 **Fast and Easy Setup**: Quickly scaffold your projects without manually writing boilerplate code.

## Installation

1. Open VS Code.
2. Navigate to the Extensions panel on the sidebar.
3. Search for `SwaggerScaffold` and click "Install."
4. Reload VS Code if necessary. 

## Usage

1. **Open Command Palette** (`Ctrl + Shift + P` or `Cmd + Shift + P` on macOS).
2. Search for `SwaggerScaffold: Generate API Structure`.
3. Enter the Swagger (OpenAPI) URL.
4. The extension will generate folder structures and request/response files automatically based on the provided Swagger address.

Here’s an expanded version of the **Configuration** section, explaining how to configure file name casing, change the prefix per HTTP method, and adjust the file extension, with an example of the JSON configuration file:

---

## Configuration

To fully customize file generation, you can create a `swaggerstruct.config.json` file in your project directory. This configuration file gives you control over how the generated files are named, how HTTP method-specific prefixes are applied, and what file extension to use for the scaffolded files.

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
  "methodPrefixes": {
    "GET": "get",
    "POST": "create",
    "PUT": "update",
    "DELETE": "delete"
  }
}
```

### Explanation:

- **File Name Casing**: The `fileNameCasing` is set to `PascalCase`, meaning all generated files will have names like `GetUserRequest.ts` or `CreatePostResponse.ts`.
  
- **HTTP Method Prefixes**: 
  - For **GET** requests, the prefix is `Get`. So, for an API route like `/users`, the generated request file will be `GetUserRequest.ts`.
  - For **POST** requests, the prefix is `Create`. For `/posts`, the request file will be `CreatePostRequest.ts`.
  - **PUT** requests will have the prefix `Update`, and **DELETE** requests will have the prefix `Delete`.

- **File Extension**: The generated files will use the `.ts` extension. You can change this to `.js`, `.json`, or any other extension if your project uses a different file type.

### How it Works

When you run the SwaggerStruct command with this configuration:
- The tool will generate a `swaggerstruct-generated-folder-structure.yaml` file, defining `users/get-user-request.ts` for `GET /users` and `posts/create-post-response.ts` for `POST /posts`.
- The tool will generate a `swaggerstruct-generated-templates.json` file containing the request and response bodies for each endpoint/file.
- File names will follow the `KebabCase` format, with the appropriate method-based prefixes and file extension.
- The content inside these files will be based on your custom template, using the generated `swaggerstruct-generated-templates.json` to replace text as defined in the request and response templates.

## Custom Templates
To customize file generation, change the generated `swaggerstruct-generated-templates.json` file. You can configure:

1. File naming conventions.
2. Custom content using placeholders like {{fileName}}, {{body}}, etc.
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
    "fileName": "some-file",
    "body": "Default body content",
    "match": "get-/api/v1/azure",
    "imports": "ReferenceDTO"
  }
}
```

### Review & Finalize Scaffolded Files

1. After the initial generation, **analyze the scaffolded files** to ensure they meet your project’s requirements.
2. **move the generated `swaggerstruct-generated-templates.json` file** to the correct directory where you want the scaffolded files to be applied.
3. Once you’ve made any necessary adjustments, open `swaggerstruct-generated-folder-structure.yaml` then **run the command** `Process Folder Structure` from the Command Palette to ensure the files are scaffolded correctly.


## Example

Given a Swagger URL, SwaggerStruct will generate:

- `/api/v1/users/`  
  - `GetUserRequest.ts`
  - `GetUserResponse.ts`
  
- `/api/v1/posts/`  
  - `CreatePostRequest.ts`
  - `CreatePostResponse.ts`

## Contribution

Feel free to open issues, submit pull requests, or suggest features. Contributions are welcome!

---
