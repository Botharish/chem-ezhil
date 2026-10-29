# ChemSphere

An interactive chemistry education explorer built with Next.js, React, TypeScript and CSS. It includes a compound library, browser-side calculations, reaction balancing demo, periodic table, molecular geometry studio and learning modules.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Optional Python scientific service

The frontend remains a Next.js app. The companion FastAPI service adds validated
RDKit structure parsing and 3D coordinates, SymPy equation balancing, NumPy/SciPy
kinetics, and Pint unit conversion.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip install -r api/requirements.txt
python3 -m uvicorn api.main:app --reload --port 8000
```

Keep the Python API running in one terminal and the Next.js app running in a
second terminal for local development. Local development sends structure
requests to `http://localhost:8000`. In production, Molecular Studio uses the
same-origin `/api` route, which is rewritten to the FastAPI service by
`vercel.json`, so the deployed site does not access a user's computer. If the
API is hosted at a separate public URL, set `NEXT_PUBLIC_CHEMSPHERE_API` to
that HTTPS URL in the deployment environment.

The service endpoints are `/api/structure`, `/api/balance`, `/api/units`, and
`/api/kinetics/first-order`. RDKit is used only for validated molecular inputs;
educational UI fallbacks remain available when the service is offline.

## Notes

This is an educational application using local sample data. It is not a substitute for laboratory safety procedures or professional chemical analysis.
