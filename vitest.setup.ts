import "dotenv/config";
// Tes integrasi memakai database terpisah agar data asli aman.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
