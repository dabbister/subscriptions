import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Stack, FormControl, InputLabel, Select, MenuItem, TextField, Card, CardContent, Chip, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { PAYMENT_STATUSES, CATEGORIES } from '../constants';
import { BACKEND_HOST } from '../constants';

const Subscriptions = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        service_name: '',
        cost: '',
        renewal_date: '',
        payment_status: 'pending',
        category: ''
    });
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchText, setSearchText] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const response = await fetch(BACKEND_HOST + '/subscriptions');
            const data = await response.json();
            setSubscriptions(data);
            setError('');
        } catch (err) {
            setError('Failed to fetch subscriptions. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const handleFilterCategory = (event) => {
        setFilterCategory(event.target.value);
    };

    const handleFilterStatus = (event) => {
        setFilterStatus(event.target.value);
    };

    const handleSearchText = (event) => {
        setSearchText(event.target.value);
    };

    const handleCancel = async (id) => {
        setSubmitting(true);
        try {
            await fetch(BACKEND_HOST + `/subscriptions/${id}/cancel`, { method: 'PATCH' });
            await fetchSubscriptions(); // Refresh the list after cancel
            setError('');
        } catch (err) {
            setError('Failed to cancel subscription. Please try again later.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenModal = () => {
        setShowModal(true);
        setIsEditMode(false);
        setFormData({
            service_name: '',
            cost: '',
            category: ''
        });
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        const url = isEditMode ? BACKEND_HOST + `/subscriptions/${formData.id}` : BACKEND_HOST + '/subscriptions';
        const method = isEditMode ? 'PATCH' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                setSubscriptions(isEditMode
                    ? subscriptions.map(sub => (sub.id === data.id ? data : sub))
                    : [...subscriptions, data]
                );
                setShowModal(false);
                setError('');
            } else {
                setError(data.message || 'Failed to save subscription. Please try again.');
            }
        } catch (err) {
            setError('Failed to save subscription. Please try again later.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleEdit = (subscription) => {
        setFormData({
            id: subscription.id,
            service_name: subscription.service_name,
            cost: subscription.cost,
            category: subscription.category || ''
        });
        setIsEditMode(true);
        setShowModal(true);
    };

    // Helper to check if a date string is today
    const isToday = (dateStr) => {
        const today = new Date();
        const date = new Date(dateStr);
        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    };

    // Update handlePay to use the new endpoint
    const handlePay = async (subId, renewal_date, instanceId) => {
        setSubmitting(true);
        setError('');
        try {
            // Use the new RESTful endpoint
            const res = await fetch(`${BACKEND_HOST}/subscriptions/${subId}/instances/${instanceId}/pay`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to mark as paid');
            }
            // Refresh subscriptions after payment
            await fetchSubscriptions();
        } catch (err) {
            setError(err.message || 'Failed to mark as paid');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSubscriptions = subscriptions.filter(sub => {
        return (
            (filterCategory ? sub.category?.toLowerCase() === filterCategory : true) &&
            (filterStatus ? sub.payment_status?.toLowerCase() === filterStatus : true) &&
            (searchText ? sub.service_name?.toLowerCase().includes(searchText.toLowerCase()) : true)
        );
    });

    // Helper for formatting numbers with commas and 2 decimals
    const formatCurrency = (num) => {
        if (isNaN(num)) return '';
        return Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading ? (
                <Typography mt={3}>Loading subscriptions...</Typography>
            ) : (
                <Box mt={4}>
                    <Typography variant="h5" mb={3}>Your Subscriptions</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} alignItems="left" justifyContent="left">
                        <FormControl sx={{ minWidth: 250 }} size="small">
                            <InputLabel id="filterCategory-label">Filter by Category</InputLabel>
                            <Select
                                labelId="filterCategory-label"
                                id="filterCategory"
                                value={filterCategory}
                                label="Filter by Category"
                                onChange={handleFilterCategory}
                                disabled={loading}
                            >
                                <MenuItem value="">All</MenuItem>
                                {CATEGORIES.map(category => (
                                    <MenuItem key={category} value={category.toLowerCase()}>{category}</MenuItem>
                                ))}
                                
                            </Select>
                        </FormControl>
                        <FormControl sx={{ minWidth: 250 }} size="small">
                            <InputLabel id="filterStatus-label">Filter by Status</InputLabel>
                            <Select
                                labelId="filterStatus-label"
                                id="filterStatus"
                                value={filterStatus}
                                label="Filter by Status"
                                onChange={handleFilterStatus}
                                disabled={loading}
                            >
                                <MenuItem value="">All</MenuItem>
                                {PAYMENT_STATUSES.map(status => (
                                    <MenuItem key={status} value={status.toLowerCase()}>{status}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Search subscriptions..."
                            variant="outlined"
                            size="small"
                            value={searchText}
                            onChange={handleSearchText}
                            disabled={loading}
                            sx={{ minWidth: 320 }}
                        />
                    </Stack>
                    {subscriptions.length === 0 ? (
                        <Typography color="text.secondary">No subscriptions found.</Typography>
                    ) : (
                        <Stack spacing={2}>
                            {filteredSubscriptions.map((sub, index) => (
                                <Card key={sub.id || index} variant="outlined" sx={{ bgcolor: '#f8f9fa' }}>
                                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography fontWeight={600}>{sub.service_name}</Typography>
                                            <Typography variant="body2" color="text.secondary">Due on {sub.current_period_end}</Typography>
                                            {sub.current_period_start && sub.current_period_end && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    Current Period: {sub.current_period_start} to {sub.current_period_end}
                                                </Typography>
                                            )}
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                Payment Status: {sub.payment_status ? sub.payment_status.charAt(0).toUpperCase() + sub.payment_status.slice(1) : 'Unknown'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                Category: {sub.category || 'Uncategorized'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                Cost: ${formatCurrency(sub.cost)}
                                            </Typography>
                                        </Box>
                                        <Stack direction="column" alignItems="center" spacing={1}>
                                            {!sub.canceled && (
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    size="small"
                                                    onClick={() => handleEdit(sub)}
                                                    sx={{ mb: 1 }}
                                                >
                                                    Modify
                                                </Button>
                                            )}
                                            {!sub.canceled && (
                                                <Button
                                                    variant="outlined"
                                                    color="success"
                                                    size="small"
                                                    onClick={() => handlePay(sub.id, sub.current_period_end, sub.current_instance_id)}
                                                    disabled={submitting || (new Date(sub.current_period_end) > new Date())}
                                                >
                                                    Pay
                                                </Button>
                                            )}
                                            {!sub.canceled && (
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => handleCancel(sub.id)}
                                                    disabled={submitting}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                            {sub.canceled && (
                                                <Chip label="Canceled" color="error" size="small" />
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                    <Button
                        variant="contained"
                        color="success"
                        sx={{ mt: 4, mb: 4, fontWeight: 600 }}
                        onClick={() => handleOpenModal()}
                    >
                        + Add Subscription
                    </Button>
                </Box>
            )}
            {/* Modal */}
            <Dialog open={showModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Typography color="primary">{isEditMode ? 'Modify Subscription' : 'Add a Subscription'}</Typography>
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseModal}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        <TextField
                            id="service_name"
                            name="service_name"
                            label="Service Name"
                            placeholder="e.g. Netflix, Spotify"
                            value={formData.service_name}
                            onChange={handleInputChange}
                            disabled={submitting}
                            autoComplete="off"
                            fullWidth
                            margin="normal"
                            required
                        />
                        <TextField
                            id="cost"
                            name="cost"
                            label="Cost"
                            placeholder="Monthly cost"
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            value={formData.cost}
                            onChange={handleInputChange}
                            disabled={submitting}
                            fullWidth
                            margin="normal"
                            required
                            InputProps={{
                                startAdornment: <span style={{ marginRight: 8 }}>$</span>
                            }}
                        />
                        <FormControl fullWidth margin="normal" required>
                            <InputLabel id="category-label">Category</InputLabel>
                            <Select
                                labelId="category-label"
                                id="category"
                                name="category"
                                value={formData.category}
                                label="Category"
                                onChange={handleInputChange}
                                disabled={submitting}
                            >
                                <MenuItem value="">Select a category</MenuItem>
                                <MenuItem value="Streaming">Streaming</MenuItem>
                                <MenuItem value="Productivity">Productivity</MenuItem>
                                <MenuItem value="Cloud Storage">Cloud Storage</MenuItem>
                                <MenuItem value="News">News</MenuItem>
                                <MenuItem value="Utilities">Utilities</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </Select>
                        </FormControl>
                        {/* Only show renewal_date field when adding a new subscription */}
                        {!isEditMode && (
                            <TextField
                                id="renewal_date"
                                name="renewal_date"
                                label="Renewal Date"
                                type="date"
                                value={formData.renewal_date || ''}
                                onChange={handleInputChange}
                                disabled={submitting}
                                fullWidth
                                margin="normal"
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        )}
                        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
                        <DialogActions sx={{ px: 0 }}>
                            <Button onClick={handleCloseModal} color="secondary" disabled={submitting}>Cancel</Button>
                            <Button type="submit" variant="contained" color="primary" disabled={submitting} sx={{ fontWeight: 600 }}>
                                {submitting ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Subscription')}
                            </Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>
            {/* End Modal */}
        </>
    );
};

export default Subscriptions;
