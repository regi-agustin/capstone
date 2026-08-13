import { apiFetch } from '../../services/api.js';

export const fetchInvoices = async () => apiFetch('billing.php');

export const fetchPayments = async () => apiFetch('billing.php?view=payments');

export const updateInvoice = async ({ id, amount, vat }) =>
  apiFetch('billing.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'update', id, amount, vat }),
  });

export const recordPayment = async ({ id, amountPaid, method, reference }) =>
  apiFetch('billing.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'payment', id, amountPaid, method, reference }),
  });
