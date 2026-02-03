-- Migration to delete pending applications for testing purposes
DELETE FROM driver_applications WHERE status = 'pending';
