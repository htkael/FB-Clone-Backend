const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Add debug logging to see if environment variables are loaded
console.log("Cloudinary Config Check:", {
  cloud_name: process.env.CLOUD_NAME ? "Found" : "Missing",
  api_key: process.env.CLOUD_API ? "Found" : "Missing",
  api_secret: process.env.CLOUD_SECRET ? "Found" : "Missing",
});

console.log("CLOUD_NAME:", process.env.CLOUD_NAME);
console.log("CLOUD_API:", process.env.CLOUD_API);
console.log("CLOUD_SECRET:", process.env.CLOUD_SECRET?.substring(0, 3) + "...");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API,
  api_secret: process.env.CLOUD_SECRET,
});

module.exports = cloudinary;
