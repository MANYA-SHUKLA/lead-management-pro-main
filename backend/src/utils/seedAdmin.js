import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.model.js';

/**
 * Seed demo credentials (Admin + Team Leader + HR).
 *
 * Uses env overrides if provided:
 * - MONGODB_URI (required)
 * - ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 * - TEAM_LEADER_EMAIL, TEAM_LEADER_PASSWORD, TEAM_LEADER_NAME
 * - HR_EMAIL, HR_PASSWORD, HR_NAME
 *
 * Defaults match README "Sample Credentials".
 */

dotenv.config({ path: '.env.local' });

const DEFAULTS = {
  admin: {
    name: 'Admin',
    email: 'admin@leadmanagement.com',
    password: 'admin123',
    role: 'admin'
  },
  teamLeader: {
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@leadmanagement.com',
    password: '12345678',
    role: 'team_leader'
  },
  hr: {
    name: 'Neha Singh',
    email: 'neha.singh@leadmanagement.com',
    password: '12345678',
    role: 'hr'
  }
};

function fromEnv(prefix, fallback) {
  return {
    name: process.env[`${prefix}_NAME`] || fallback.name,
    email: process.env[`${prefix}_EMAIL`] || fallback.email,
    password: process.env[`${prefix}_PASSWORD`] || fallback.password,
    role: fallback.role
  };
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ Missing MONGODB_URI. Set it in backend/.env.local (or your environment).');
    process.exit(1);
  }

  await connectDB();

  const admin = fromEnv('ADMIN', DEFAULTS.admin);
  const teamLeader = fromEnv('TEAM_LEADER', DEFAULTS.teamLeader);
  const hr = fromEnv('HR', DEFAULTS.hr);

  const emailsToReset = [admin.email, teamLeader.email, hr.email];

  // Idempotent: remove previous demo users by email
  await User.deleteMany({ email: { $in: emailsToReset } });

  const createdAdmin = await User.create({
    name: admin.name,
    email: admin.email,
    password: admin.password,
    role: admin.role,
    createdBy: null
  });

  const createdTeamLeader = await User.create({
    name: teamLeader.name,
    email: teamLeader.email,
    password: teamLeader.password,
    role: teamLeader.role,
    createdBy: createdAdmin._id
  });

  const createdHR = await User.create({
    name: hr.name,
    email: hr.email,
    password: hr.password,
    role: hr.role,
    teamLeader: createdTeamLeader._id,
    createdBy: createdAdmin._id
  });

  console.log('\n✅ Seeded demo users successfully:\n');
  console.table([
    { role: createdAdmin.role, email: admin.email, password: admin.password },
    { role: createdTeamLeader.role, email: teamLeader.email, password: teamLeader.password },
    { role: createdHR.role, email: hr.email, password: hr.password }
  ]);
  console.log('\nNext: start backend, then login via POST /api/auth/login\n');
}

seed()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Seed failed:', err);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore
    }
    process.exit(1);
  });

