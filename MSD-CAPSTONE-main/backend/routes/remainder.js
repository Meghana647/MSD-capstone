const cron = require("node-cron");
const Reminder = require("../models/Remainder"); 
const Webinar = require("../models/Webinar");
const nodemailer = require("nodemailer");

// Gmail SMTP setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "lakshmisatvikasuggula2006@gmail.com",
    pass: "123456", // use app password
  },
});


function getEmailContent(webinar, type) {
  let subject = "";
  let text = "";

  if (type === "1day") {
    subject = `Reminder: ${webinar.title} is tomorrow!`;
    text = `Hi, this is a reminder that the webinar "${webinar.title}" will start tomorrow at ${webinar.time}.`;
  } else if (type === "1hour") {
    subject = `Starting Soon: ${webinar.title} in 1 hour!`;
    text = `The webinar "${webinar.title}" will start in 1 hour. Please be ready to join using your meeting link.`;
  } else if (type === "30min") {
    subject = `Happening Now: ${webinar.title} starts in 30 minutes!`;
    text = `Your webinar "${webinar.title}" starts in 30 minutes. Please get ready to join using the provided link.`;
  }

  return { subject, text };
}

// Run every minute
cron.schedule("*/1 * * * *", async () => {
  const now = new Date();

  try {
    // Get all pending reminders with webinar details
    const reminders = await Reminder.find({ status: "pending" }).populate("webinarId");

    for (const r of reminders) {
      const webinar = r.webinarId;
      if (!webinar || !webinar.date || !webinar.time) continue;

      const webinarDateTime = new Date(`${webinar.date}T${webinar.time}`);
      const diffMin = Math.floor((webinarDateTime - now) / 60000);

      // Check reminder window
      if (
        (r.type === "1day" && diffMin <= 1440 && diffMin > 60) ||
        (r.type === "1hour" && diffMin <= 60 && diffMin > 30) ||
        (r.type === "30min" && diffMin <= 30 && diffMin > 0)
      ) {
        const { subject, text } = getEmailContent(webinar, r.type);

        try {
          await transporter.sendMail({
            from: "lakshmisatvikasuggula2006@gmail.com",
            to: r.recipientEmail,
            subject,
            text,
          });

          r.status = "sent";
          r.sentAt = now;
          await r.save();

          console.log(`Sent ${r.type} reminder to ${r.recipientEmail}`);
        } catch (err) {
          r.status = "failed";
          r.errorMessage = err.message;
          await r.save();

          console.error(`Failed ${r.type} reminder to ${r.recipientEmail}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Scheduler error:", err);
  }
});
