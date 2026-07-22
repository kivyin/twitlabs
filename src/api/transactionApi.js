import { apiRequest, authHeaders, triggerUnauthorized } from "./http";
import { invalidateForeignKeyLabelCache } from "../utils/foreignKeyLabelCache";

export function getTransaction(id) {
  return apiRequest(`/api/budget/transactions/${id}`, { method: "GET" });
}

export function getTransfer(id) {
  return getTransaction(id);
}

export async function createTransaction(data) {
  const result = await apiRequest("/api/budget/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
  invalidateForeignKeyLabelCache("payees");
  return result;
}

export async function createTransfer(data) {
  return createTransaction({
    from_account_id: data.from_account_id,
    to_account_id: data.to_account_id,
    amount: data.amount,
    category_id: data.category_id,
    user_id: data.user_id,
    transaction_date: data.transaction_date,
    description: data.description ?? null,
    payee_id: data.payee_id ?? null,
  });
}

export async function updateTransaction(id, data) {
  const result = await apiRequest(`/api/budget/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  invalidateForeignKeyLabelCache("payees");
  return result;
}

export async function updateTransfer(id, data) {
  return updateTransaction(id, {
    from_account_id: data.from_account_id,
    to_account_id: data.to_account_id,
    amount: data.amount,
    category_id: data.category_id,
    user_id: data.user_id,
    transaction_date: data.transaction_date,
    description: data.description ?? null,
    payee_id: data.payee_id ?? null,
  });
}

export function deleteTransaction(id) {
  return apiRequest(`/api/budget/transactions/${id}`, {
    method: "DELETE",
  });
}

export function listTransactionAttachments(transactionId) {
  return apiRequest(`/api/budget/transactions/${transactionId}/attachments`, {
    method: "GET",
  });
}

export function uploadTransactionAttachment(
  transactionId,
  { fileBase64, mimeType, filename, source = "upload" } = {}
) {
  return apiRequest(`/api/budget/transactions/${transactionId}/attachments`, {
    method: "POST",
    body: JSON.stringify({
      file_base64: fileBase64,
      mime_type: mimeType,
      filename,
      source,
    }),
  });
}

export function deleteTransactionAttachment(transactionId, attachmentId) {
  return apiRequest(`/api/budget/transactions/${transactionId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function downloadTransactionAttachment(
  transactionId,
  attachmentId,
  filename = "attachment"
) {
  const response = await fetch(
    `/api/budget/transactions/${transactionId}/attachments/${attachmentId}?download=1`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  if (response.status === 401) {
    triggerUnauthorized();
  }

  if (!response.ok) {
    let message = "Unable to download attachment.";
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      // Ignore JSON parse errors for binary failure responses.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
