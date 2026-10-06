# 🛡️ Cybersécurité Offensive

> [!tip] 💡 **Bienvenue**
> Cette note est un **point d'entrée**. Toute la base de connaissances est dans le dossier
> **Cybersécurité Offensive** en liens internes Obsidian.

➡️ **[[Cybersécurité Offensive|🗺️ Ouvrir l'Index de la base de connaissances]]**

---

## 🗺️ Accès rapide

- [[Cybersécurité Offensive/01 - Reconnaissance|🕵️ 01 - Reconnaissance]]
- [[Cybersécurité Offensive/02 - Scan & Énumération|🔍 02 - Scan & Énumération]]
- [[Cybersécurité Offensive/03 - Exploitation Web|🌍 03 - Exploitation Web]]
- [[Cybersécurité Offensive/04 - Exploitation Réseau|💥 04 - Exploitation Réseau & BO]]
- [[Cybersécurité Offensive/05 - Active Directory|👑 05 - Active Directory]]
- [[Cybersécurité Offensive/06 - Post-Exploitation|🕹️ 06 - Post-Exploitation]]
- [[Cybersécurité Offensive/07 - Wireless, MITM & Social Engineering|📡 07 - Wireless / MITM / SE]]
- [[Cybersécurité Offensive/08 - Password Cracking|🔐 08 - Password Cracking]]
- [[Cybersécurité Offensive/09 - Reverse Engineering & Malware|🧬 09 - Reverse & Malware]]
- [[Cybersécurité Offensive/10 - Cheatsheets|⚡ 10 - Cheatsheets]]
- [[Cybersécurité Offensive/11 - Glossaire|📖 11 - Glossaire]]
- [[Cybersécurité Offensive/12 - Ressources & Lab|🎓 12 - Ressources & Lab]]
- [[Cybersécurité Offensive/13 - Hardware & IoT|⚙️ 13 - Hardware & IoT]]
- [[Bibliothèque technique|🗂️ Bibliothèque de Techniques (fiches détaillées)]]
- [[Cybersécurité Offensive/Progression Lab|🎯 Progression Lab (Kanban)]]
- [[Cybersécurité Offensive/Méthodologie PTES (Excalidraw)|🗺️ Méthodologie PTES (Excalidraw)]]

---

## 📊 Tableau de bord du vault (Dataview)

> [!info] Compteurs automatiques mis à jour par Dataview à chaque ouverture.

```dataviewjs
const tech = dv.pages('"Cybersécurité Offensive/Techniques"').where(p => p.type === "technique");
const outils = dv.pages('"Cybersécurité Offensive/Outils"').where(p => p.type === "outil");
dv.paragraph(`- **${tech.length}** fiches techniques`);
dv.paragraph(`- **${outils.length}** fiches outils`);
dv.paragraph(`- **${dv.pages('"Cybersécurité Offensive/Outils"').where(p => p.categorie && p.categorie.includes("IDS")).length}** outils défensifs (IDS/SIEM)`);
dv.paragraph(`- **${dv.pages().where(p => p.file.folder).length}** notes au total dans le vault`);
```

### Notes principales

```dataview
TABLE WITHOUT ID
  file.link AS "Note",
  file.folder AS "Dossier",
  dateformat(file.mtime, "yyyy-MM-dd") AS "Modifié"
FROM "Cybersécurité Offensive"
WHERE file.name != "Index"
SORT file.mtime DESC
LIMIT 8
```

---

> [!warning] ⚖️ **Avertissement légal**
> Usage pédagogique et lab uniquement. Tout test sans autorisation est illégal.
