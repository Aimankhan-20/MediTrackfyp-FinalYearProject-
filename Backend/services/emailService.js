// YE FILE EMAIL BHEJNE KE LIYE HAI
const nodemailer = require("nodemailer");

// Email configuration - .env file se credentials lete hain
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail", // Gmail use kar rahe hain
    auth: {
      user: process.env.EMAIL_USER,     // Aapka Gmail address
      pass: process.env.EMAIL_PASSWORD, // Gmail App Password (NOT regular password)
    },
  });
};

// Email bhejne ka main function
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = createTransporter();

    // Email options
    const mailOptions = {
      from: `"Meditrack Health" <${process.env.EMAIL_USER}>`, // Sender name aur email
      to: to,                    // Receiver ka email
      subject: subject,          // Email subject
      html: htmlContent,         // Email ka HTML content
    };

    // Email send karo
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return { success: false, error: error.message };
  }
};

// VERIFICATION CODE EMAIL - Forgot password ke liye
const sendVerificationEmail = async (email, code, userName = "User") => {
  const subject = "Meditrack - Password Reset Code";
  
  // Beautiful HTML email template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 40px; }
        .code-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 10px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Meditrack Health</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <h2>Hello ${userName}! 👋</h2>
          <p>We received a request to reset your password. Use the verification code below:</p>
          
          <div class="code-box">
            <div class="code">${code}</div>
            <p style="color: #666; margin-top: 10px;">⏰ This code expires in 10 minutes</p>
          </div>
          
          <p><strong>Security Notice:</strong></p>
          <ul style="color: #666;">
            <li>Never share this code with anyone</li>
            <li>If you didn't request this, please ignore this email</li>
            <li>Your password won't change until you complete the reset process</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2024 Meditrack Health Solutions. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, htmlContent);
};

// PASSWORD RESET SUCCESS EMAIL
const sendPasswordResetSuccessEmail = async (email, userName = "User") => {
  const subject = "Meditrack - Password Changed Successfully";
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 40px; }
        .success-icon { font-size: 60px; text-align: center; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Meditrack Health</h1>
        </div>
        <div class="content">
          <div class="success-icon">✅</div>
          <h2 style="text-align: center; color: #10b981;">Password Changed Successfully!</h2>
          <p>Hello ${userName},</p>
          <p>Your Meditrack password has been successfully reset.</p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>🔒 Your account is now secure with the new password.</strong></p>
          </div>
          
          <p><strong>If you didn't make this change:</strong></p>
          <ul style="color: #666;">
            <li>Contact our support team immediately</li>
            <li>Someone may have unauthorized access to your account</li>
          </ul>
          
          <p>Thank you for using Meditrack! 💙</p>
        </div>
        <div class="footer">
          <p>© 2024 Meditrack Health Solutions. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, htmlContent);
};

const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready to send emails');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetSuccessEmail,
};