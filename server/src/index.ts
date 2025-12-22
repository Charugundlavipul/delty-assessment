import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabaseClient';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
import patientRoutes from './routes/patients';
import appointmentRoutes from './routes/appointments';
import doctorRoutes from './routes/doctors';

app.use(express.json()); // Ensure JSON parsing is enabled before routes
app.use(cors());

app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);

app.get('/', (req, res) => {
  res.send('Server is running');
});

// Example API endpoint to test Supabase connection
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase.from('test').select('*').limit(1);
    if (error) throw error;
    res.json({ message: 'Supabase connection successful', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
