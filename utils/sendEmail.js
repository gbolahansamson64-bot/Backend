const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {

    console.log("📧 sendEmail received:", {
            to,
            subject,
            hasHtml: !!html,
            typeofTo: typeof to,
        });

    const { data, error } = await resend.emails.send({
      from: `Blegab Luxury Wigs <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("[Resend API Error]:", error);
      throw new Error(error.message || "Failed to send email");
    }

    console.log("✅ Email sent successfully");
    console.log("Recipient:", to);
    console.log("Email ID:", data?.id);

    return data;
  } catch (error) {
    console.error("❌ sendEmail error:", error);
    throw error;
  }
};

module.exports = sendEmail;