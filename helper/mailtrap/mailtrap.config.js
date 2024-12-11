const { MailtrapClient } = require("mailtrap");
const dotenv  = require("dotenv");

dotenv.config();
// console.log( process.env.MAILTRAP_API_TOKEN)

const mailtrapClient = new MailtrapClient({
  token: process.env.MAILTRAP_API_TOKEN,
});

const sender = {
  email: "hello@demomailtrap.com",
  name: "Trong Khang",
};

module.exports = { mailtrapClient, sender };
