import { type Invitation } from "@/db/schema";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
import "dotenv/config";

/**
 * send invitation email
 */
export const sendInvitationEmail = async (invitation: Invitation) => {
  const { data, error } = await resend.emails.send({
    from: "Acme <onboarding@elshazlii.dev>",
    to: [invitation.email],
    subject: "You are invited to shiftly",
    html: `
      <h1>You've been invited!</h1>
      <p>Click the link below to accept your invitation:</p>
      <p>Or copy this link: ${invitation.token}</p>
      <p>This link expires in 7 days.</p>
    `,
  });

  if (error) {
    console.error("Failed to send email: ", error);
    throw new Error("Failed to send invitation email");
  }

  console.log("Email sent", { data });
};

/**
 * Send reset-password email
 */
export const sendResetPasswordEmail = async (email: string, url: string) => {
  const apiPath = "/api" + url.split("/api")[1];
  const newUrl = process.env.SERVER_URL + apiPath;
  const { data, error } = await resend.emails.send({
    from: "Acme <onboarding@elshazlii.dev>",
    to: [email],
    subject: "Reset password email",
    html: `
      <h1>You are resetting password</h1>
      <p>Click the link below to accept your invitation:</p>
      <p>Or copy this link: ${newUrl}</p>
      <p>This link expires in 24 hours.</p>
    `,
  });

  if (error) {
    console.error("Failed to send email: ", error);
    throw new Error("Failed to send reset password email");
  }

  console.log("Email sent", { data });
};

/**
 * send invitation email
 */
export const sendBulkInvitationEmails = async (invitations: Invitation[]) => {
  const emails = Array.from(
    invitations.map((inv) => ({
      from: "Acme <onboarding@elshazlii.dev>",
      to: [inv.email],
      subject: "You are invited to shiftly",
      html: `
      <h1>You've been invited!</h1>
      <p>Click the link below to accept your invitation:</p>
      <p>Or copy this link: ${inv.token}</p>
      <p>This link expires in 7 days.</p>
    `,
    }))
  );

  const { data, error } = await resend.batch.send(emails);

  if (error) {
    console.error("Failed to send email: ", error);
    throw new Error("Failed to send invitation email");
  }

  console.log("Email sent", { data });
};
