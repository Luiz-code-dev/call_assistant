// Run once to generate VAPID keys for web push notifications
// Usage: node scripts/generate-vapid-keys.mjs
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\n=== VAPID Keys Generated ===");
console.log("Add these to your Railway environment variables:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`NEXT_PUBLIC_VAPID_KEY=${keys.publicKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@speakf.com.br`);
console.log(`CRON_SECRET=your-random-secret-here`);
console.log("\n⚠️  Keep VAPID_PRIVATE_KEY secret. Never commit it.\n");
