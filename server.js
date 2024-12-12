import express from 'express';
import multer from 'multer';
import path from 'path';
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import FormData from 'form-data';

const app = express();
const port = 3000;

let nodes = [];         // Array to hold node information
let jobQueue = [];      // Job queue to hold tasks to be processed
let currentNodeIndex = 0;  // Round-robin index
let jobResults = {};   // Object to hold the job results by user

const upload = multer({ dest: 'uploads/' });

// Get the current directory for file paths (fixing the __dirname issue in ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());

// Root endpoint serves the form for file upload
app.get('/', (req, res) => {
    res.send(`
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <label for="userName">Name:</label>
      <input type="text" id="userName" name="userName" required><br><br>
      <label for="file">Select file:</label>
      <input type="file" id="file" name="file" required><br><br>
      <label for="dataset">Optional Dataset (ZIP file):</label>
      <input type="file" id="dataset" name="dataset"><br><br>
      <button type="submit">Submit</button>
    </form>
  `);
});

// Endpoint to handle file uploads and add jobs to the queue
app.post('/upload', upload.fields([{ name: 'file' }, { name: 'dataset' }]), (req, res) => {
    const userName = req.body.userName;
    const filePath = path.join(__dirname, 'uploads', req.files['file'][0].filename);
    const datasetPath = req.files['dataset'] ? path.join(__dirname, 'uploads', req.files['dataset'][0].filename) : null;

    console.log(`Received file from user: ${userName}`);
    console.log(`File uploaded to: ${filePath}`);

    // Store the job result in the jobResults object for the user
    jobResults[userName] = { status: 'Processing', result: null };

    jobQueue.push({ userName, filePath, datasetPath });
    processJobQueue();

    res.send(`<p>File received! Your job is being processed...</p>`);
});

// Function to process jobs from the queue
async function processJobQueue() {
    if (jobQueue.length === 0) {
        console.log('No jobs to process.');
        return;
    }

    const availableNode = getNextAvailableNode();
    if (availableNode) {
        const job = jobQueue.shift();  // Get the next job from the queue
        console.log(`Assigning job to node ${availableNode.address}...`);
        await assignJobToNode(job, availableNode);
    } else {
        console.log('No available nodes for processing.');
    }
}

// Round-robin selection of the next available node
function getNextAvailableNode() {
    if (nodes.length === 0) {
        console.log('No nodes registered.');
        return null;
    }

    let node = null;
    let attempts = 0;

    // Try to find the next available node in a round-robin manner
    while (attempts < nodes.length) {
        node = nodes[currentNodeIndex];
        if (node.status === 'available') {
            break;
        }
        attempts++;
        currentNodeIndex = (currentNodeIndex + 1) % nodes.length;  // Move to the next node in a round-robin fashion
    }

    if (node && node.status === 'available') {
        console.log(`Node ${node.address} selected for processing.`);
        return node;
    } else {
        console.log('No available node found after round-robin check.');
        return null;
    }
}

// Assign job to a node for processing
async function assignJobToNode(job, node) {
    node.status = 'busy';  // Mark node as busy

    try {
        const nodeUrl = `http://${node.address}:3001/process-job`;  // Ensure the correct port

        console.log(`Sending job to node ${node.address}: ${nodeUrl}`);

        // Prepare the form data for the file and dataset
        const form = new FormData();
        form.append('file', fs.createReadStream(job.filePath));
        if (job.datasetPath) {
            form.append('dataset', fs.createReadStream(job.datasetPath));
        }

        // Send the job to the worker node
        const response = await axios.post(nodeUrl, form, {
            headers: form.getHeaders(),
        });

        console.log(`Job completed on node ${node.address}: ${response.data.result}`);
        node.status = 'available';  // Mark node as available again

        // Store the result in the jobResults object
        jobResults[job.userName] = { status: 'Completed', result: response.data.result };

        // Delete the uploaded files after processing
        deleteUploadedFile(job.filePath);
        if (job.datasetPath) deleteUploadedFile(job.datasetPath);

        // Process the next job in the queue
        processJobQueue();
    } catch (error) {
        console.error(`Error executing job on node ${node.address}: ${error.message}`);
        node.status = 'available';  // Mark node as available again

        // Optionally, requeue the job
        jobQueue.unshift(job);
        console.log(`Job requeued. Total jobs in queue: ${jobQueue.length}`);

        // Try processing the next job
        processJobQueue();
    }
}

// Function to delete uploaded files after processing
function deleteUploadedFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Error deleting file: ${filePath}`);
        } else {
            console.log(`File deleted: ${filePath}`);
        }
    });
}

// Endpoint to register nodes
app.post('/register-node', (req, res) => {
    const { address } = req.body;
    if (!address) return res.status(400).send("Node address is required.");

    if (nodes.some(node => node.address === address)) {
        return res.status(400).send(`Node ${address} is already registered.`);
    }

    const node = { address, status: 'available' };
    nodes.push(node);

    console.log(`Node registered: ${node.address}`);
    console.log(`Total nodes registered: ${nodes.length}`);

    res.send(`Node registered: ${node.address}`);
});

// Endpoint to receive output from the worker
app.post('/receive-output', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    console.log('Received output file:', req.file);
    const outputFilePath = path.join(__dirname, 'uploads', req.file.filename);
    res.send('Output received successfully');
});

// Endpoint to get job status and result
app.get('/job-status/:userName', (req, res) => {
    const userName = req.params.userName;
    if (jobResults[userName]) {
        const { status, result } = jobResults[userName];
        if (status === 'Completed') {
            res.send(`<p>Your job is completed!</p><pre>${result}</pre>`);
        } else {
            res.send(`<p>Your job is still being processed...</p>`);
        }
    } else {
        res.status(404).send(`<p>No job found for user: ${userName}</p>`);
    }
});

// Start the proxy server
app.listen(3000, '10.20.24.90', () => {
    console.log(`Proxy server listening at http://10.20.24.90:${port}`);
});

