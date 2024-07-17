const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3039;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Replace with your actual OpenAI API key
const OPENAI_API_KEY = 'secretkey';

// Route for handling code visualization
app.post('/visualize', async (req, res) => {
    const code = req.body.code;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are an assistant that generates code for visualizing graphics.' },
                { role: 'user', content: `generate code similar to this: document.getElementById('visualization-container').innerHTML += <div class="green-box"><br>..etc depending on number of declared variables in the following code, just the plain code without code type:\n\n${code}, only code in answer, and squares contain variables names, make sure the <br> element is added between boxes. if an element is array or vector add boxes to its line as many as its size, all variables squares should include variables names and values`}
                // { role: 'user', content: `generate code similar to this but i want the code for a moving triangle: document.getElementById('visualization-container').innerHTML += <div class=triangle-right "..etc, make sure triangle keeps moving across screen. strip the code so that it starts from the word 'document'..etc`}
                
            ],
            max_tokens: 150
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });

        const visualizationCode = response.data.choices[0].message.content.trim();
        res.json({ code: visualizationCode });
    } catch (error) {
        console.error('Error fetching visualization:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch visualization' });
    }
});

// Route for handling code compilation
app.post('/compile', async (req, res) => {
    const code = req.body.code;
    const filePath = path.join(__dirname, 'cpp', 'code.cpp');
    const outputFilePath = path.join(__dirname, 'cpp', 'code.out');

    try {
        // Write code to file
        fs.writeFileSync(filePath, code);

        // Compile the code
        exec(`g++ ${filePath} -o ${outputFilePath}`, (compileError, compileStdout, compileStderr) => {
            if (compileError) {
                console.error('Compilation error:', compileStderr);
                res.json({ output: `Compilation error:\n${compileStderr}` });
                return;
            }

            // Execute the compiled code
            exec(outputFilePath, (execError, execStdout, execStderr) => {
                if (execError) {
                    console.error('Execution error:', execStderr);
                    res.json({ output: `Runtime error:\n${execStderr}` });
                    return;
                }

                // Successfully compiled and executed
                res.json({ output: execStdout });
            });
        });
    } catch (error) {
        console.error('Error handling code:', error);
        res.status(500).json({ error: 'Failed to handle code' });
    }
});

// Serve static files
app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
