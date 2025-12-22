# Assessment Project

This repository contains a client-server architecture application using React (Vite) and Node.js (Express), integrated with Supabase.

## Project Structure
- `client/`: Frontend application (React + TypeScript).
- `server/`: Backend application (Node + Express + TypeScript).

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- Supabase account and project (URL and Anon Key)

### Server Setup
1. Navigate to the server directory:
   ```bash
   cd server
   npm install
   ```
2. Configure Environment Variables:
   - Open `.env` file in `server/`.
   - Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your Supabase credentials.
   - Update `PORT` if needed (default 5000).

3. Run the server:
   - Development: `npm run dev`
   - Production Build: `npm run build` then `npm start`

### Client Setup
1. Navigate to the client directory:
   ```bash
   cd client
   npm install
   ```
2. Run the client:
   - Development: `npm run dev`
   - Build: `npm run build`

## Deployment Guide

### Client (Vercel)
The client is a standard Vite application.
1. Push this repository to GitHub/GitLab.
2. Import the project in Vercel.
3. Select the `client` directory as the Root Directory.
4. Vercel should auto-detect the Vite framework.
5. Deploy.

### Server (AWS)
The server is a standard Node.js application.
1. Build the project: `npm run build`
2. Deploy the `dist` folder and `package.json`.
3. Set environment variables on your AWS service (e.g., Elastic Beanstalk, EC2).
4. Start command: `npm start`
