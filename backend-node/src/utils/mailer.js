const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendResetEmail(to, resetLink) {
    await transporter.sendMail({
        from: `"CareerGenie" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Reset your password",
        html: `
            <h2>Reset your password</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>This link expires in 30 minutes.</p>
        `
    });
}

module.exports = { sendResetEmail };