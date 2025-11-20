const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

console.log('🔍 Checking .env file...\n');

if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists\n');
    process.exit(0);
}

console.log('⚠️  .env file not found!');
console.log('📝 Creating .env from .env.example...\n');

try {
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created successfully!');
        console.log('📄 Location:', envPath);
        console.log('\n💡 You can now run the dev server!\n');
    } else {
        console.error('❌ .env.example not found!');
        console.log('\n📝 Creating .env with default values...\n');

        const defaultEnv = '# Database URL for SQLite (Local Development)\nDATABASE_URL="file:./dev.db"\n';
        fs.writeFileSync(envPath, defaultEnv);

        console.log('✅ .env file created with default values!');
        console.log('📄 Location:', envPath);
        console.log('\n💡 You can now run the dev server!\n');
    }
    process.exit(0);
} catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    console.log('\n📝 Please manually create .env file with:');
    console.log('DATABASE_URL="file:./dev.db"\n');
    process.exit(1);
}
