import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import axios from 'axios';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import FormData from 'form-data'; // Importing the form-data package

// Initialize express app
const app = express();
const port = 3001;

// Set up file upload handling with multer
const upload = multer({ dest: 'uploads/' });

// Get the current directory for file paths (fixing the __dirname issue in ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use JSON middleware for parsing incoming data
app.use(express.json());

// Function to compile code using Docker
async function compileCodeWithDocker(filePath, res) {
    // Resolve absolute path for the uploaded file
    const absFilePath = path.resolve(__dirname, filePath);

    // Define Docker command to run a container with the uploaded file
    const command = `docker run --rm -v ${absFilePath}:/usr/src/app/code_file -w /usr/src/app python:3.8 python code_file`; // Example for Python code

    console.log('Running Docker container to compile code...');

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error during Docker execution: ${error.message}`);
            res.status(500).send('Error during compilation');
            return;
        }
        if (stderr) {
            console.error(`Docker stderr: ${stderr}`);
            res.status(500).send('Compilation failed');
            return;
        }

        // Save the stdout to a temp file
        const outputFilePath = path.join(__dirname, 'output.txt');
        fs.writeFileSync(outputFilePath, stdout);
        console.log(`Output written to ${outputFilePath}`);

        // Send output file to the proxy server
        sendOutputToProxy(outputFilePath, res);
    });
}

// Function to send the output file to the proxy server
// Update sendOutputToProxy function to include userName
async function sendOutputToProxy(outputFilePath, res) {
    const proxyUrl = 'http://10.20.24.90:3000/receive-output';
    const userName = 'exampleUser'; // Replace with actual user name passed in the job (e.g., from job context)

    try {
        const fileStream = fs.createReadStream(outputFilePath);

        const formData = new FormData();
        formData.append('file', fileStream);
        formData.append('userName', userName); // Add userName here

        const response = await axios.post(proxyUrl, formData, {
            headers: formData.getHeaders(),
        });

        console.log('Output sent to proxy server:', response.data);
        res.send({ status: 'completed', result: 'Job processed successfully' });
    } catch (error) {
        console.error('Error sending output to proxy server:', error.message);
        res.status(500).send('Failed to send output to proxy server');
    }
}

// Endpoint to receive the uploaded code file and dataset
app.post('/process-job', upload.single('file'), (req, res) => {
    const { file } = req;

    if (!file) {
        return res.status(400).send('No file uploaded');
    }

    console.log(`Received file: ${file.originalname}`);
    console.log(`File uploaded to: ${file.path}`);

    // Compile the file inside the Docker container
    compileCodeWithDocker(file.path, res);
});

// Register Node to Proxy Server on Startup
const registerNode = async () => {
    const nodeAddress = 'http://10.20.24.90:3000/register-node'; // Proxy server IP and port
    const workerIp = '192.168.122.58'; // Use the correct Worker IP with the port

    try {
        const response = await axios.post(nodeAddress, { address: workerIp });
        console.log('Node registered:', response.data);
    } catch (error) {
        console.error('Error registering node:', error.message);
        if (error.response) {
            console.error('Proxy server response:', error.response.data);
        }
        // Retry registration after a delay if it fails
        setTimeout(registerNode, 5000); // Retry after 5 seconds
    }
};

// Register worker node on startup
registerNode();

// Start the worker server
app.listen(port, () => {
    console.log(`Worker server listening at http://192.168.122.58:${port}`);
});
