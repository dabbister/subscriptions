import React, { useState, useEffect } from 'react';
import './App.css';
import { BACKEND_HOST } from './constants';
import {
    Box,
    Typography,
    Container,
    Tabs,
    Tab,
    Alert
} from '@mui/material';
import Dashboard from './Pages/Dashboard';
import Subscriptions from './Pages/Subscriptions';
import Reminders from './Pages/Reminders';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

const tabPaths = ['/subscriptions', '/summary', '/reminders'];

function App() {
    const [tabIndex, setTabIndex] = useState(0);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const idx = tabPaths.indexOf(location.pathname);
        setTabIndex(idx === -1 ? 0 : idx);
    }, [location.pathname]);

    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
        navigate(tabPaths[newValue]);
    };

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
            <Container maxWidth="md">
                <Box component="header" mb={4} textAlign="center">
                    <Typography variant="h3" fontWeight={700} color="primary" letterSpacing={1}>
                        Subscription Tracker
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" mt={2}>
                        Easily manage and track your recurring services
                    </Typography>
                </Box>
                <Tabs value={tabIndex} onChange={handleTabChange} centered sx={{ mb: 4 }}>
                    <Tab label="Subscriptions" />
                    <Tab label="Summary" />
                    <Tab label="Reminders" />
                </Tabs>
                <Routes>
                    <Route path="/" element={<Navigate to="/subscriptions" replace />} />
                    <Route path="/summary" element={<Dashboard />} />
                    <Route path="/reminders" element={<Reminders />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                </Routes>
            </Container>
        </Box>
    );
}

export default App;
