let express = require('express')
let app = express()
let cors = require('cors')
let bodyParser = require("body-parser")
let mongoose = require('mongoose')
let bcrypt = require("bcrypt")
let jwt = require('jsonwebtoken')
let nodemailer = require("nodemailer")
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const Chat = require("./models/Chat");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const coursesRouter = require('./routes/courses');


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",   // you can restrict later to your frontend domain
    methods: ["GET", "POST"]
  }
});

let messages = [];

io.on("connection", (socket) => {
  console.log("User connected");

  socket.emit("previousMessages", messages);

  socket.on("chatMessage", (msg) => {
    const message = {
      id: Date.now().toString(),
      ...msg,
      createdAt: new Date(),
    };
    messages.push(message);
    io.emit("chatMessage", message);
  });

  
  socket.on("deleteMessage", ({ messageId, type, user, selectedUsers }) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    if (type === "everyone") {
      msg.text = "This message was deleted";
      io.emit("messageDeleted", { messageId, forEveryone: true });
    } else if (type === "me") {
      socket.emit("messageDeleted", { messageId, forMe: true });
    } else if (type === "specific" && selectedUsers?.length > 0) {
      selectedUsers.forEach((userSocketId) => {
        io.to(userSocketId).emit("messageDeleted", { messageId, specific: true });
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "courses";
    let resource_type = "auto";

    return {
      folder,
      resource_type,
    };
  },
});

const upload = multer({ storage })


app.use(express.static(path.join(__dirname, "frontend")));
app.use(express.static(path.join(__dirname, "public")));
const webinarRoutes = require("./routes/webinars");
const paymentRoutes = require("./routes/stripe");


app.use(cors())
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }))
require("./routes/remainder");
app.use('/api/courses', coursesRouter);


const SECRET = "sdf9@2Kls#8hGf$1mN"





mongoose.connect("mongodb://127.0.0.1:27017/elearning")
.then(() => console.log("Database connected"))
.catch(err => console.log(err))

// Import models from separate files
const Student = require("./models/Student");
const Parent = require("./models/Parent");
const Host = require("./models/Host");
const Contact = require("./models/Contact");

app.post("/signup", async (req, res) => {
  const { role, name, email, password, extra } = req.body
  try {
    let existingUser
    if (role === "student") existingUser = await Student.findOne({ email })
    else if (role === "parent") existingUser = await Parent.findOne({ email })
    else if (role === "host") existingUser = await Host.findOne({ email })

    if (existingUser) return res.status(400).json({ message: "Email already registered" })

    const hashedPassword = await bcrypt.hash(password, 10)

    if (role === "student") {
      const newStudent = new Student({ name, email, password: hashedPassword, grade: extra })
      await newStudent.save()
    } else if (role === "parent") {
      const newParent = new Parent({ name, email, password: hashedPassword, childUsername: extra })
      await newParent.save()
    } else if (role === "host") {
      const newHost = new Host({ name, email, password: hashedPassword, organization: extra })
      await newHost.save()
    } else return res.status(400).json({ message: "Invalid role selected" })

    res.json({ message: "Signup successful" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/login", async (req, res) => {
  const { email, password } = req.body
  try {
    let user = await Student.findOne({ email })
    let role = "student"

    if (!user) {
      user = await Parent.findOne({ email })
      role = "parent"
    }
    if (!user) {
      user = await Host.findOne({ email })
      role = "host"
    }

    if (!user) return res.status(400).json({ message: "User not found" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" })

    const token = jwt.sign({ id: user._id, role }, SECRET, { expiresIn: "1h" })
    res.status(200).json({ message: "Login successful", role, name: user.name, token })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const newContact = new Contact({ name, email, subject, message });
    await newContact.save();
    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user =
      (await Student.findOne({ email })) ||
      (await Parent.findOne({ email })) ||
      (await Host.findOne({ email }));

    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "10m" });
     const resetLink = `http://localhost:3000/frontend/resetpassword.html?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "lakshmisatvikasuggula2006@gmail.com", 
        pass: "urkv nxzx mczm urrl",
      },
    });
    const mailOptions = {
      from: "lakshmisatvikasuggula2006@gmail.com",
      to: email,
      subject: "Password Reset Link",
      html: `
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 10 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset link sent to your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while sending email" });
  }
});

app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, SECRET);
    const hashed = await bcrypt.hash(newPassword, 10);

    let user = await Student.findById(decoded.id) ||
               await Parent.findById(decoded.id) ||
               await Host.findById(decoded.id);

    if (!user) return res.status(400).json({ message: "User not found" });

    user.password = hashed;
    await user.save();

    res.json({ message: "Password reset successful!" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid or expired link" });
  }
});

app.get("/reset-password/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "resetpassword.html"));
});

app.use("/api/webinars", webinarRoutes);
app.use("/api/stripe", paymentRoutes);



server.listen(3000, () => {
  console.log("Server running")
})