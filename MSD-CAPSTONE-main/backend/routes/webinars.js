const express = require("express");
const router = express.Router();
const Registration = require("../models/Registration");
const nodemailer = require("nodemailer");
const Host=require("../models/Host")
const Webinar=require("../models/Webinar")
const cron = require("node-cron");
const Reminder = require("../models/Remainder");

// Gmail SMTP 
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "lakshmisatvikasuggula2006@gmail.com",     
        pass: "urkv nxzx mczm urrl"                      // Gmail App Password
    }
});



router.get("/get", async (req, res) => {
  try {
    const webinars = await Webinar.find();
    res.json({ webinars });
  } catch (err) {
    res.status(500).json({ message: "Error fetching webinars" });
  }
});

// Runs every minute: "*/1 * * * *"
cron.schedule("*/1 * * * *", async () => {
  const now = new Date();

 
  const webinars = await Webinar.find();
  for (const w of webinars) {
    if (w.date && w.time) {
      const webinarDateTime = new Date(`${w.date}T${w.time}`);
      if (webinarDateTime < now) {
        console.log(`Deleting expired webinar: ${w.title}`);
        await Webinar.deleteOne({ _id: w._id });
      }
    }
  }
});

// POST /api/webinars/verify-host
router.post("/verify-host", async (req, res) => {
  const { email } = req.body;
  try {
    const hostExists = await Host.findOne({ email });
    if (hostExists) {
      res.json({ verified: true });
    } else {
      res.status(404).json({ verified: false, message: "Host not found!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

function generateJitsiLink(webinarTitle) {
  const base = "https://meet.jit.si/";
  const formattedTitle = webinarTitle.replace(/\s+/g, "_");
  const randomToken = Math.random().toString(36).substring(2, 8);
  return `${base}${formattedTitle}_${randomToken}`;
}


router.post("/register", async (req, res) => {
  const { name, email, webinar } = req.body;

  if (!name || !email || !webinar) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user already registered for the same webinar
    const existing = await Registration.findOne({ email, webinar });
    const ewebinar = await Registration.findOne({ webinar });
    if (existing) {
      return res.status(400).json({
        message: "You have already registered for this webinar!",
        meetingLink: existing.meetingLink,
      });
    }
    let meetingLink = generateJitsiLink(webinar);
    if (ewebinar) {
        meetingLink=ewebinar.meetingLink
    };
      
    // Save new registration
    const newRegistration = new Registration({
      name,
      email,
      webinar,
      meetingLink,
    });
    await newRegistration.save();
    
    const existingWebinar = await Webinar.findOne({ title: webinar });
    if (!existingWebinar) {
      return res.status(404).json({ message: "Webinar not found!" });
    }
    const alreadyRegistered = existingWebinar.participants.some(
      (p) => p.email === email
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        message: "You have already registered for this webinar!",
        meetingLink: existingWebinar.meetingLink,
      });
    }
    existingWebinar.participants.push({
      name,
      email,
      registeredAt: new Date(),
    });
    await existingWebinar.save();
    const now = new Date();
const webinarTime = new Date(existingWebinar.dateTime);
const diffMinutes = (webinarTime - now) / (1000 * 60); 


const reminderTimes = [
  { type: "1day", minutesBefore: 1440 },
  { type: "1hour", minutesBefore: 60 },
  { type: "30min", minutesBefore: 30 },
  { type: "1min", minutesBefore: 1 },
];


const validReminders = reminderTimes.filter(rt => diffMinutes > rt.minutesBefore);


if (diffMinutes >= 1 && validReminders.length > 0) {
  const reminders = validReminders.map(rt => ({
    webinarId: existingWebinar._id,
    recipientEmail: email,
    recipientName: name,
    type: rt.type,
    status: "pending",
  }));

  await Reminder.insertMany(reminders);
  console.log("Reminders created:", validReminders.map(r => r.type));
} else if (diffMinutes < 1) {
  console.log("Webinar starts in less than 1 minute — no reminders created.");
} else {
  console.log("No valid reminders fit the remaining time before the webinar.");
}

    const mailOptions = {
      from: "lakshmisatvikasuggula2006@gmail.com",
      to: email,
      subject: `Jitsi Meeting Details for ${webinar}`,
      text: `Hello ${name},

You have successfully registered for the webinar "${webinar}".

Join the meeting using the link below:
${meetingLink}

No password is required — just click and join when the webinar starts.

Thank you!`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error("Error sending email:", err);
      else console.log("Email sent:", info.response);
    });

   
    res.status(201).json({
      message: `Registered successfully for ${webinar}. Meeting details sent to your email.`,
      meetingLink,
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
});


router.post("/create", async (req, res) => {
  const { title, description, date, time, price, hostname, hostemail } = req.body;

  if (!title || !hostname || !hostemail) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // check if a webinar already exists with same title and date
    const existing = await Webinar.findOne({ title, date });
    if (existing) {
      return res.status(400).json({ message: "Webinar already exists!" });
    }

    
    const webinarDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (webinarDate < today) {
      return res.status(400).json({ message: "Webinar date cannot be in the past!" });
    }

    // generate meeting link
    const meetingLink = generateJitsiLink(title);

    // create new webinar
    const newWebinar = new Webinar({
      title,
      description,
      date,
      time,
      price,
      hostname,
      hostemail,
      meetingLink,
    });
    await newWebinar.save();

    
    const hostRegistration = new Registration({
      name: hostname,
      email: hostemail,
      webinar: title,
      meetingLink: meetingLink,
    });
    await hostRegistration.save();
    const now = new Date();
    const webinarDateTime = new Date(`${newWebinar.date}T${newWebinar.time}`);
    const diffMinutes = (webinarDateTime - now) / (1000 * 60);

    console.log("⏰ Webinar starts in:", diffMinutes.toFixed(2), "minutes");

    const reminderTimes = [
      { type: "1day", minutesBefore: 1440 },
      { type: "1hour", minutesBefore: 60 },
      { type: "30min", minutesBefore: 30 },
      { type: "1min", minutesBefore: 1 },
    ];

    const validReminders = reminderTimes.filter(rt => diffMinutes > rt.minutesBefore);

    if (diffMinutes >= 1 && validReminders.length > 0) {
      const reminders = validReminders.map(rt => ({
        webinarId: newWebinar._id,
        recipientEmail: hostemail,
        recipientName: hostname,
        type: rt.type,
        status: "pending",
      }));

      await Reminder.insertMany(reminders);
      console.log("Created reminders:", validReminders.map(r => r.type));
    } else if (diffMinutes < 1) {
      console.log("Webinar starts in less than 1 minute — no reminders created.");
    } else {
      console.log("No valid reminders — webinar starts too soon.");
    }

    
    const mailOptions = {
      from: "lakshmisatvikasuggula2006@gmail.com",
      to: hostemail,
      subject: `Webinar Created: ${title}`,
      text: `Hello ${hostname},

Your webinar "${title}" has been successfully created.

Date: ${date}
Time: ${time}
Price: ₹${price || 0}

🔗 Jitsi Meeting Link:
${meetingLink}

You are automatically registered as the host for this webinar.

Thank you for hosting on our platform!
— LearnOnTheGo`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending host email:", err);
      } else {
        console.log("Host email sent:", info.response);
      }
    });

    res.status(201).json({
      message: "Webinar created successfully and host registered (email sent)!",
      webinar: newWebinar,
    });

  } catch (error) {
    console.error("Error creating webinar:", error.message);
    res.status(500).json({ message: "Error creating webinar" });
  }
});


router.post("/check-registration", async (req, res) => {
  try {
    const { email, webinar } = req.body;

    // Check both fields are present
    if (!email || !webinar) {
      return res.status(400).json({ message: "Email and webinar are required" });
    }

    // Check in database (assuming you have a Registration model)
    const existing = await Registration.findOne({ email, webinar });

    if (existing) {
      return res.json({ registered: true });
    } else {
      return res.json({ registered: false });
    }
  } catch (err) {
    console.error("Error checking registration:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;



