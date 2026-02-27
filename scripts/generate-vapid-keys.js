/**
 * Generate VAPID keys for Web Push notifications
 * Run with: node scripts/generate-vapid-keys.js
 */

const crypto = require('crypto');

function generateVAPIDKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  console.log('\n=== VAPID Keys Generated ===\n');
  console.log('Add these to your .env.local file:\n');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKeyBase64}`);
  console.log(`VAPID_PRIVATE_KEY=${privateKeyBase64}`);
  console.log('\nAlso add to Vercel environment variables for production.\n');
}

generateVAPIDKeys();
