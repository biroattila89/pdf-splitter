# PDF Splitter

The PDF Splitter is an Electron-based project. This application is used to split a PDF document according to specific dimension requirements.

## Installation

Before you start your work with PDF Splitter, ensure that you have Node.js and npm installed on your system. Navigate to the project directory and run the following command to install all the dependencies:

**npm install**

## Dependencies
Our project relies on several dependencies:

- Electron: A framework which lets us write cross-platform desktop applications using HTML, CSS and JavaScript. We're using version 29.0.1.
- PDF-Lib: A versatile JavaScript library that can help us handle a lot of PDF-related tasks, like splitting, merging, and modifying PDF pages. We're using version 1.17.1.

## Building and Packaging

This project provides two npm scripts for building and packaging the application: `pack` and `dist`.

### npm run pack

The `npm run pack` command is used to compile the application into an unpackaged format. This is useful for testing the build process and the application itself without creating a distributable installer. The output will be placed in the `dist` folder but will not include installer files. This is a quick way to verify the application's build without going through the packaging and distribution steps.

To execute this command, use:

```bash
npm run pack
```

### npm run dist

The `npm run dist` command is used for creating a distributable version of the application. This includes packaging the application into a format suitable for distribution (e.g., .exe for **Windows**, .dmg for **macOS**). It utilizes the configurations defined in the build section of the package.json, ensuring that the application is correctly packaged for the target platforms.

Running this command generates the installer files in the dist folder, making it easy to distribute the application to users.

To execute this command, use:

```bash
npm run dist
```

## Starting the application
To start the application, use:
```bash
npm start
```

## Contributing
We warmly welcome contributions to PDF Splitter. Please make sure that your code follows our coding standards.

## Core Functionality
### Splitting PDFs:
- **User-Friendly Interface:** The application offers a straightforward, intuitive interface that guides users through the process of splitting PDF documents. Even those with minimal technical expertise can navigate the application with ease.
- **Custom Split Options:** Users can choose how they want to split their PDF files—whether by page numbers, bookmarks, or size. This flexibility ensures that the resulting files meet the user's specific needs.
- **Batch Processing:** For users dealing with multiple documents, the PDF Splitter supports batch processing, allowing several PDFs to be split simultaneously, saving time and effort.

### Progress Updates:
- **Real-Time Feedback:** As the application processes documents, users receive real-time updates on the progress. This feature keeps users informed about the status of their task, enhancing transparency and trust in the application's efficiency.

### Output Control:
- **Custom Output Folders:** Users have the option to select a specific folder for the output files, providing greater control over file organization and accessibility.
- **Notification of Completion:** Upon completion of the splitting process, the application notifies the user and provides information on where to find the output files. This ensures users can easily access their split documents without having to navigate through their file system.

## Additional Features
- **About Section:** The application includes an "About" section accessible from the menu, offering quick access to additional information about the application, its version, and a link to the project's GitHub page for those interested in learning more or contributing to its development.
- **Custom Icon:** The application features a custom-designed icon, indicative of its functionality as a PDF splitter, enhancing its visibility and recognition on the user's desktop.
- **Executable Launch:** Users can start the application using a generated executable for macOS or Windows, ensuring compatibility and ease of access across different operating systems.

## Security and Privacy
The PDF Splitter operates entirely offline, ensuring that all documents remain on the user's device without the need for internet connectivity. This approach guarantees that sensitive information contained within the PDFs is not exposed to external servers or potential security risks.
