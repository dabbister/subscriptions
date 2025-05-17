import React, { useState, useEffect } from 'react';
import { BACKEND_HOST } from '../constants';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';

const Reminders = () => {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchReminders = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(BACKEND_HOST + '/reminders');
            if (response.ok) {
                const data = await response.json();
                setReminders(data);
            } else {
                setError('Failed to fetch reminders.');
            }
        } catch (err) {
            setError('Error connecting to the backend.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReminders();
    }, []);

    // Helper for formatting numbers with commas and 2 decimals
    const formatCurrency = (num) => {
        if (isNaN(num)) return '';
        return Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (!reminders || reminders.length === 0) {
        return (
            <Box mt={6}>
                <Typography variant="h6" mb={2} color="warning.main">Reminders</Typography>
                <Typography color="text.secondary">
                    No reminders found.<br />
                    Reminders will appear here automatically for active subscriptions with a future renewal date.
                </Typography>
            </Box>
        );
    }
    return (
        <Box mt={6}>
            <Typography variant="h6" mb={2} color="warning.main">Reminders Not Sent</Typography>
            {loading ? (
                <Typography>Loading reminders...</Typography>
            ) : error ? (
                <Typography color="error.main">{error}</Typography>
            ) : reminders.length === 0 ? (
                <Typography color="text.secondary">No reminders found.</Typography>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Service Name</TableCell>
                                <TableCell>Renewal Date</TableCell>
                                <TableCell>Reminder Send Date</TableCell>
                                <TableCell>Sent</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Cost</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reminders.map((sub) => (
                                <TableRow key={sub.reminder_id || sub.id}>
                                    <TableCell>{sub.service_name}</TableCell>
                                    <TableCell>{sub.current_period_end || sub.renewal_date}</TableCell>
                                    <TableCell>{sub.send_date}</TableCell>
                                    <TableCell>{sub.sent ? 'Yes' : 'No'}</TableCell>
                                    <TableCell>{sub.category || 'Uncategorized'}</TableCell>
                                    <TableCell>${formatCurrency(sub.cost)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default Reminders;
