import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Stack, Chip } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Cloud';
import { BACKEND_HOST } from '../constants';

const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await fetch(BACKEND_HOST + '/summary');
                if (response.ok) {
                    const data = await response.json();
                    setSummary(data);
                } else {
                    setError('Failed to fetch summary.');
                }
            } catch (err) {
                setError('Error connecting to the backend fetching summary dashboard.');
            }
        };
        fetchSummary();
    }, []);
    // Helper for formatting numbers with commas and 2 decimals
    const formatCurrency = (num) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (error) return <Typography color="error">{error}</Typography>;
    if (!summary) return null;
    return (
        <Box mb={5}>
            <Typography variant="h5" fontWeight={700} mb={2} color="primary">
                Dashboard Summary Overview
            </Typography>
            <Grid container spacing={3} direction="column" alignItems="stretch">
                <Grid item xs={12} display="flex">
                    <Card elevation={6} sx={{ bgcolor: '#e3f2fd', borderRadius: 3, flex: 1 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Stack direction="column" spacing={1} alignItems="center" justifyContent="center" mb={1}>
                                <Typography variant="h6" color="primary">Total Monthly Cost</Typography>
                            </Stack>
                            <Typography variant="h3" fontWeight={700} color="primary.main">
                                ${formatCurrency(summary.total_monthly_cost)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} display="flex">
                    <Card elevation={6} sx={{ bgcolor: '#e8f5e9', borderRadius: 3, flex: 1 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Stack direction="column" spacing={1} alignItems="center" justifyContent="center" mb={1}>
                                <Typography variant="h6" color="success.main">Total Annual Cost</Typography>
                            </Stack>
                            <Typography variant="h3" fontWeight={700} color="success.main">
                                ${formatCurrency(summary.total_annual_cost)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} display="flex">
                    <Card elevation={6} sx={{ bgcolor: '#fff3e0', borderRadius: 3, flex: 1 }}>
                        <CardContent>
                            <Stack direction="column" spacing={1} alignItems="center" justifyContent="center" mb={1}>
                                <Typography variant="h6" color="warning.main" textAlign="center">
                                    Cost by Category
                                </Typography>
                            </Stack>
                            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                                {summary.cost_by_category && Object.entries(summary.cost_by_category).map(([cat, cost]) => (
                                    <li key={cat}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
                                            <Chip label={cat} color="warning" size="small" sx={{ mr: 1 }} />
                                            <Typography fontWeight={600} color="text.secondary">${formatCurrency(cost)}</Typography>
                                        </Stack>
                                    </li>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
