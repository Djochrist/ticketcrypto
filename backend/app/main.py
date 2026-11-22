"""
main.py — Point d'entrée du backend TicketCrypto.
Lancer avec :  uv run uvicorn app.main:app --reload
"""
from fastapi import FastAPI

app = FastAPI(title="TicketCrypto API")


@app.get("/api/health")
def health():
    """Route de test : sert seulement à vérifier que le serveur répond."""
    return {"status": "ok"}
