export const forgotPasswordTemplate = (name: string, resetLink: string) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2>Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#0d9488;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p>This link will expire in 15 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;
};

export const passwordChangedTemplate = (name: string) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #222;">
      <h2>Password Changed Successfully</h2>
      <p>Hello ${name},</p>
      <p>Your account password was changed successfully.</p>
      <p>If this was not you, please contact support immediately.</p>
    </div>
  `;
};