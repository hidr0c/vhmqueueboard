const fs = require('fs');
const path = require('path');

// Check if .env exists, if not create from .env.example
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env file not found!');

    if (fs.existsSync(envExamplePath)) {
        console.log('📄 Creating .env from .env.example...');
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created successfully!');
    } else {
        console.log('📝 Creating default .env file...');
        const defaultEnv = 'DATABASE_URL="file:./dev.db"\n';
        fs.writeFileSync(envPath, defaultEnv);
        console.log('✅ Default .env file created!');
    }
} else {
    console.log('✅ .env file exists');
}
