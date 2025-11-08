const express = require("express");
const router = express.Router();
const ContactMessage = require("../models/ContactMessage");

// Function to generate ticket number
function generateTicketNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TK${year}${month}-${random}`;
}

// ===== SUBMIT CONTACT MESSAGE =====
router.post("/submit", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    console.log('📧 Backend received:', { name, email, subject });

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: "All fields are required" 
      });
    }

    // ✅ Generate ticket number MANUALLY
    const ticketNumber = generateTicketNumber();
    console.log('🎫 Generated ticket:', ticketNumber);

    // Create message with ticket number
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      ticketNumber: ticketNumber, // ⭐ Manually set
    });

    await contactMessage.save();

    console.log('✅ Message saved successfully');

    res.status(201).json({
      message: "Message sent successfully. We'll get back to you within 24 hours.",
      ticketNumber: contactMessage.ticketNumber,
      data: {
        ticketNumber: contactMessage.ticketNumber,
        name: contactMessage.name,
        email: contactMessage.email,
        subject: contactMessage.subject,
        status: contactMessage.status,
        createdAt: contactMessage.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Submit error:", error);
    res.status(500).json({ 
      message: "Failed to send message",
      error: error.message 
    });
  }
});

// GET all messages
router.get("/all", async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ count: messages.length, data: messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;