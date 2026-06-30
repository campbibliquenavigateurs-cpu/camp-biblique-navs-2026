// ============================================================
// Camp Biblique-Navs 2026 — Récupération après échec de chargement
// ============================================================
// Quand une nouvelle version de l'application est déployée pendant
// qu'une page reste ouverte, les fichiers techniques générés
// dynamiquement (export Excel, PDF...) peuvent échouer à charger :
// soit parce que l'ancien fichier n'existe plus sur le serveur, soit
// parce que le Service Worker (PWA) garde l'ancienne version active
// en arrière-plan et continue d'intercepter les requêtes avec
// d'anciennes réponses.
//
// Un simple rechargement de page (window.location.reload) ne suffit
// PAS dans ce second cas : le Service Worker reste actif et contrôle
// toujours la page après le rechargement. Cette fonction désactive
// explicitement tout Service Worker existant avant de recharger,
// garantissant que la prochaine version chargée soit bien la plus
// récente, sans interception par l'ancienne.
// ============================================================

export async function recupererApresEchecChargement(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const enregistrements = await navigator.serviceWorker.getRegistrations()
      await Promise.all(enregistrements.map(r => r.unregister()))
    }
    if ('caches' in window) {
      const cles = await caches.keys()
      await Promise.all(cles.map(cle => caches.delete(cle)))
    }
  } catch {
    // Si la désactivation échoue, on recharge tout de même : c'est
    // toujours mieux qu'un blocage silencieux.
  }
  window.location.reload()
}
