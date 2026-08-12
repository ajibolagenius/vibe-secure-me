package handlers

import (
	"encoding/json"
	"net/http"
)

func GetInvoice(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// Authenticated, but never checks the caller owns this invoice.
	invoice, err := db.FindInvoiceByID(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(invoice)
}
