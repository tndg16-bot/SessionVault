
const http = require('http');
const https = require('https');

const CONFIG = {
    obsidian: {
        port: 27123,
        apiKey: 'e02a92151916c4bad4894534f03c58f745d44bf5fa6e0c21fe77c8dd6acce56e',
        testFile: 'SessionVault-logs/INTEGRATION_TEST.md'
    },
    ollama: {
        host: 'localhost',
        port: 11434,
        model: 'gemma3:1b' // Using a smaller model that fits in memory
    }
};

// Helper for HTTP requests (avoiding fetch for compatibility)
function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body
                });
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

async function testOllama() {
    console.log('--- Testing Ollama ---');
    try {
        // 1. Check tags
        console.log('Checking Ollama status and models...');
        let result = await request({
            hostname: CONFIG.ollama.host,
            port: CONFIG.ollama.port,
            path: '/api/tags',
            method: 'GET'
        });

        if (result.statusCode !== 200) {
            throw new Error(`Ollama status check failed: ${result.statusCode}`);
        }
        console.log('Ollama is running. Models available.');

        // 2. Generate Summary
        console.log(`Generating summary with model ${CONFIG.ollama.model}...`);
        const prompt = "This is a test. Summarize this: The quick brown fox jumps over the lazy dog.";

        result = await request({
            hostname: CONFIG.ollama.host,
            port: CONFIG.ollama.port,
            path: '/api/generate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({
            model: CONFIG.ollama.model,
            prompt: prompt,
            stream: false
        }));

        if (result.statusCode !== 200) {
            throw new Error(`Ollama generation failed: ${result.statusCode} - ${result.body}`);
        }

        const response = JSON.parse(result.body);
        console.log('Ollama Summary:', response.response.trim());
        console.log('Ollama Test PASSED ✔️');
        return true;
    } catch (e) {
        console.error('Ollama Test FAILED ❌:', e.message);
        return false;
    }
}

async function testObsidian() {
    console.log('\n--- Testing Obsidian ---');
    try {
        console.log(`Attempting to write to ${CONFIG.obsidian.testFile}...`);

        const content = `# Integration Test
        
Test run at: ${new Date().toISOString()}
Obsidian Local REST API integration is working!
`;

        const result = await request({
            hostname: '127.0.0.1',
            port: CONFIG.obsidian.port,
            path: `/vault/${encodeURIComponent(CONFIG.obsidian.testFile)}`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${CONFIG.obsidian.apiKey}`,
                'Content-Type': 'text/markdown'
            }
        }, content);

        if (result.statusCode !== 200 && result.statusCode !== 204) { // 204 No Content is sometimes success for PUT
            // Actually Obsidian REST API usually returns 200 or 204
            // If file exists, it might overwrite.
            if (result.statusCode === 401) throw new Error("Unauthorized (Check API Key)");
            if (result.statusCode === 404) throw new Error("Not Found (Check Vault/Path)");
            // Let's print body if error
            throw new Error(`Status ${result.statusCode}: ${result.body}`);
        }

        console.log(`Successfully wrote file. Status: ${result.statusCode}`);
        console.log('Obsidian Test PASSED ✔️');
        return true;

    } catch (e) {
        console.error('Obsidian Test FAILED ❌:', e.message);
        return false;
    }
}

async function run() {
    const ollamaOk = await testOllama();
    const obsidianOk = await testObsidian();

    if (ollamaOk && obsidianOk) {
        console.log('\n✅ ALL INTEGRATION TESTS PASSED');
        process.exit(0);
    } else {
        console.log('\n❌ TESTS FAILED');
        process.exit(1);
    }
}

run();
