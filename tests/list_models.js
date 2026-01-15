
const http = require('http');

http.get('http://localhost:11434/api/tags', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        const data = JSON.parse(body);
        console.log('Available Models:');
        data.models.forEach(m => console.log(`- ${m.name} (${m.details.parameter_size})`));
    });
});
