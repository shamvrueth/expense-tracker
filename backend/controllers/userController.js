import connection from '../db.js';
import bcrypt from 'bcrypt';
import { sendOtpEmail } from '../utils/sendEmail.js';

// Get user details
export const getUserDetails = async (req, res) => {
  const { user_id } = req.user;

  try {
    const { rows } = await connection.query(
      // FIX 1: Removed quotes from "Users"
      'SELECT user_id, name, email, phone_number FROM Users WHERE user_id = $1',
      [user_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user data" });
  } finally {

  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  const { user_id } = req.user;
  const { name, email, phone_number, password } = req.body;

  try {
    // ... (rest of the logic is fine)
    const updateFields = [];
    const values = [];

    if (name) {
      updateFields.push(`name = $${values.length + 1}`);
      values.push(name);
    }
    if (email) {
      updateFields.push(`email = $${values.length + 1}`);
      values.push(email);
    }
    if (phone_number) {
      updateFields.push(`phone_number = $${values.length + 1}`);
      values.push(phone_number);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password_hash = $${values.length + 1}`);
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(user_id);
    // FIX 2: Removed quotes from "Users"
    const sql = `UPDATE Users SET ${updateFields.join(", ")} WHERE user_id = $${values.length}`;

    await connection.query(sql, values);

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  } finally {

  }
};

// Send OTP to new email
export const sendEmailUpdateOtp = async (req, res) => {
  const { newEmail } = req.body;
  if (!newEmail) return res.status(400).json({ message: "Email required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // FIX 3: Removed quotes from "EmailOtps"
    await connection.query(
      `INSERT INTO EmailOtps (email, otp)
       VALUES ($1, $2)
       ON CONFLICT (email)
       DO UPDATE SET otp = EXCLUDED.otp`,
      [newEmail, otp]
    );

    await sendOtpEmail(newEmail, otp);
    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    // This catch block is failing because sendOtpEmail is failing.
    // Check your backend logs for the error from Nodemailer.
    res.status(500).json({ message: "Failed to send OTP" });
  } finally {

  }
};

// Verify OTP
export const verifyEmailUpdateOtp = async (req, res) => {
  const { newEmail, otp } = req.body;
  if (!newEmail || !otp) return res.status(400).json({ message: "Email and OTP required" });

  try {
    // FIX 4: Removed quotes from "EmailOtps"
    const { rows } = await connection.query(
      'SELECT * FROM EmailOtps WHERE email = $1 AND otp = $2',
      [newEmail, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await connection.query('DELETE FROM EmailOtps WHERE email = $1', [newEmail]);

    res.json({ message: "OTP verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OTP verification failed" });
  } finally {

  }
};