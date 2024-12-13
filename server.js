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
    jobResults[userName] = { status: 'Processing', result: null, logs: [] };

    // Add initial log message
    jobResults[userName].logs.push('Job is being processed...');

    jobQueue.push({ userName, filePath, datasetPath });
    processJobQueue();

    // Redirect the user to the job status page
    res.redirect(`/job-status/${userName}`);
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
    node.status = 'busy';

    try {
        const nodeUrl = `http://${node.address}:3001/process-job`;

        console.log(`Sending job to node ${node.address}...`);
        jobResults[job.userName].logs.push(`Sending job to node ${node.address}...`);

        const form = new FormData();
        form.append('file', fs.createReadStream(job.filePath));
        if (job.datasetPath) {
            form.append('dataset', fs.createReadStream(job.datasetPath));
        }

        // Add a timeout
        const response = await axios.post(nodeUrl, form, {
            headers: form.getHeaders(),
            timeout: 30000, // 30-second timeout
        });

        console.log(`Job completed on node ${node.address}`);
        jobResults[job.userName].logs.push(`Job completed successfully.`);
        jobResults[job.userName].status = 'Completed';
        jobResults[job.userName].result = response.data.result;

        node.status = 'available';
        processJobQueue();
    } catch (error) {
        console.error(`Error executing job on node ${node.address}: ${error.message}`);
        jobResults[job.userName].logs.push(`Error: ${error.message}`);
        node.status = 'available';
        jobQueue.unshift(job); // Requeue job
        processJobQueue();
    }
}

// Endpoint to register nodes
// Endpoint to receive output file
app.post('/receive-output', upload.single('file'), (req, res) => {
    const userName = req.body.userName;
    if (!req.file || !userName) {
        return res.status(400).send('No file uploaded or user information missing.');
    }

    console.log('Received output file:', req.file);
    const outputFileName = req.file.filename;  // Save only the filename, not the full path

    // Save the output file information in the jobResults object
    if (jobResults[userName]) {
        jobResults[userName].resultFileName = outputFileName;  // Save the filename in the jobResults
        jobResults[userName].logs.push('Output file received and stored.');
        jobResults[userName].status = 'Completed';  // Update status to 'Completed'
    } else {
        console.error(`Job result not found for user: ${userName}`);
    }

    res.send('Output received successfully');
});



// Updated job status endpoint to display file content and provide download link
// Updated job status endpoint to display file content and provide download link
app.get('/job-status/:userName', (req, res) => {
    const userName = req.params.userName;
    if (jobResults[userName]) {
        const { status, logs, outputFileName, outputFilePath } = jobResults[userName];
        let logsHtml = `<h3>Job Logs:</h3><textarea rows="20" cols="80" readonly>${logs.join('\n')}</textarea>`;

        let downloadLink = '';
        if (status === 'Completed' && fs.existsSync(outputFilePath)) {
            try {
                const fileContent = fs.readFileSync(outputFilePath, 'utf-8');
                console.log(`Output file content for user "${userName}":\n`, fileContent);

                downloadLink = `
          <p>Your job is completed!</p>
          <form action="/download-file" method="get">
            <input type="hidden" name="fileName" value="${encodeURIComponent(outputFileName)}">
            <button type="submit">Download Output File</button>
          </form>
          <h3>Processed File Content:</h3>
          <pre>${fileContent}</pre>`;
            } catch (err) {
                console.error(`Error reading file: ${outputFileName}`, err);
                downloadLink = `<p>Error reading file content.</p>`;
            }
        }

        res.send(`
      ${downloadLink}
      ${logsHtml}
    `);
    } else {
        res.status(404).send(`<p>No job found for user: ${userName}</p>`);
    }
});




// Endpoint to handle file download
// Endpoint to handle file download
app.get('/download-file', (req, res) => {
    const fileName = req.query.fileName;

    // Check if fileName is provided
    if (!fileName) {
        console.error('No file name provided.');
        return res.status(400).send('File name is required.');
    }

    // Resolve file path
    const resolvedFilePath = path.join(__dirname, 'uploads', fileName);

    // Check if the file exists
    if (!fs.existsSync(resolvedFilePath)) {
        console.error(`File not found: ${resolvedFilePath}`);
        return res.status(404).send('File not found.');
    }

    // Initiate file download
    res.download(resolvedFilePath, (err) => {
        if (err) {
            console.error('Error occurred while downloading the file:', err.message);
            res.status(500).send('Error occurred while downloading the file.');
        }
    });
});


// Endpoint to register nodes
app.post('/register-node', (req, res) => {
    const { address } = req.body;
    if (!address) return res.status(400).send("Node address is required.");

    const existingNode = nodes.find(node => node.address === address);
    if (existingNode) {
        return res.send(`Node ${address} is already registered.`);
    }

    const node = { address, status: 'available' };
    nodes.push(node);

    console.log(`Node registered: ${node.address}`);
    res.send(`Node registered: ${node.address}`);
});


// Start the server
app.listen(3000, '10.20.24.90', () => {
    console.log(`Proxy server listening at http://10.20.24.90:${port}`);
});