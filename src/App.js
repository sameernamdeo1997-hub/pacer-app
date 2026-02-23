import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// 1. Connect to your live database (PASTE YOUR URL AND KEY HERE)
const supabaseUrl = "https://mnerssdqzaneybkuqakh.supabase.co";
const supabaseKey = "sb_publishable_HIQ9OLdDSPK4qJsHVuQh-w_K7irR0RG";
const supabase = createClient(supabaseUrl, supabaseKey);

// Custom Tooltip for the UI
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#1f2937', color: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
        <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>Ideal Pace: <span style={{ color: 'white' }}>{payload[0]?.value} hrs left</span></p>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#60a5fa', fontWeight: 'bold' }}>Actual Pace: {payload[1]?.value} hrs left</p>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [session, setSession] = useState(null); // Tracks if the user is logged in
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logDate, setLogDate] = useState("");
  const [hoursSpent, setHoursSpent] = useState("");

  // 2. The Bouncer: Check if someone is logged in when the app opens
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data function
  async function fetchLogs() {
    const { data, error } = await supabase.from('daily_logs').select('log_date, hours_spent').order('log_date', { ascending: true });
    if (!error && data) {
      let startingHours = 100; 
      let idealPace = 100;
      const formattedData = data.map(log => {
        startingHours -= log.hours_spent;
        idealPace -= 3.5; 
        return { date: log.log_date, actualRemaining: startingHours, idealRemaining: idealPace };
      });
      setChartData(formattedData);
      setLoading(false);
    }
  }

  // Load data only if logged in
  useEffect(() => {
    if (session) fetchLogs();
  }, [session]);

  // Handle form submit
  async function handleSubmit(e) {
    e.preventDefault();
    if (!logDate || !hoursSpent) return alert("Please fill in both fields!");
    const { error } = await supabase.from('daily_logs').insert([{ log_date: logDate, hours_spent: parseFloat(hoursSpent), confidence_level: 3 }]);
    if (!error) {
      setLogDate("");
      setHoursSpent("");
      fetchLogs();
    }
  }

  // 3. IF NOT LOGGED IN: Show the Login Screen
  if (!session) {
    return (
      <div style={{ padding: '50px', backgroundColor: '#111827', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1f2937', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>Sign In to Pacer</h2>
          {/* This is the pre-built Supabase login box! */}
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} theme="dark" providers={[]} />
        </div>
      </div>
    );
  }

  // 4. IF LOGGED IN: Show the Dashboard
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#111827', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header with Sign Out Button */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'white', margin: 0 }}>Dashboard</h2>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #4B5563', backgroundColor: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>

      {/* The Chart Section */}
      <div style={{ width: '100%', maxWidth: '800px', height: '400px', backgroundColor: '#1f2937', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ color: 'white', marginTop: 0 }}>Velocity: Target Completion</h3>
        {loading ? <p style={{ color: 'white' }}>Loading database...</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4B5563', strokeWidth: 2 }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>
              <Line type="monotone" name="Ideal Pace" dataKey="idealRemaining" stroke="#6B7280" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" name="Actual Pace" dataKey="actualRemaining" stroke="#3B82F6" strokeWidth={4} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* The Input Form Section */}
      <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#1f2937', padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ color: 'white', marginTop: 0, marginBottom: '15px' }}>Log Study Hours</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px' }}>
          <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #4B5563', backgroundColor: '#374151', color: 'white', flex: '1' }} />
          <input type="number" placeholder="Hours spent (e.g., 2.5)" step="0.1" value={hoursSpent} onChange={(e) => setHoursSpent(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #4B5563', backgroundColor: '#374151', color: 'white', flex: '1' }} />
          <button type="submit" style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#3B82F6', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Add to Chart</button>
        </form>
      </div>

    </div>
  );
}