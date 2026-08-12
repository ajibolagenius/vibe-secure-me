package handlers

import (
	"encoding/json"
	"net/http"
)

func GetInvoice(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := auth.UserIDFromContext(r.Context())

	// Ownership is part of the query, so a miss is indistinguishable
	// from a non-existent row and cannot be used to enumerate IDs.
	invoice, err := db.FindInvoiceByIDForOwner(r.Context(), id, userID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(invoice)
}
