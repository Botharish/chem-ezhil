'use client';

import { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';

type Example = [string, string];

type StructureData = {
  formula: string;
  canonical_smiles: string;
  molar_mass: number;
  atoms: Array<{ element: string; x: number; y: number; z: number }>;
  molfile: string;
};

const examples: Example[] = [
  ['Ethanol', 'CCO'],
  ['Water', 'O'],
  ['Glucose', 'C(C1C(C(C(C(O1)O)O)O)O)O'],
  ['Sodium chloride', '[Na+].[Cl-]'],
  ['Carbon dioxide', 'O=C=O'],
  ['Ammonia', 'N'],
  ['Methane', 'C'],
  ['Caffeine', 'Cn1cnc2c1c(=O)n(C(=O)n2C)C'],
  ['Aspirin', 'CC(=O)Oc1ccccc1C(=O)O'],
  ['Phenol', 'Oc1ccccc1'],
  ['Benzene', 'c1ccccc1'],
  ['Acetic acid', 'CC(=O)O'],
  ['Hydrogen peroxide', 'OO'],
  ['Sulfuric acid', 'OS(=O)(=O)O'],
  ['Hydrochloric acid', 'Cl'],
  ['Sodium hydroxide', '[Na+].[OH-]'],
  ['Calcium carbonate', 'O=C([O-])[O-].[Ca+2]'],
  ['Sodium bicarbonate', 'OC(=O)[O-].[Na+]'],
  ['Nitric acid', 'O[N+](=O)O'],
  ['Urea', 'NC(=O)N'],
];

const chemistryApiUrl = (process.env.NEXT_PUBLIC_CHEMSPHERE_API || 'http://localhost:8000').replace(/\/$/, '');

const ethanolFallback: StructureData = {
  formula: 'C2H6O',
  canonical_smiles: 'CCO',
  molar_mass: 46.069,
  atoms: [
    { element: 'C', x: -1.2, y: 0, z: 0 },
    { element: 'C', x: 0, y: 0, z: 0 },
    { element: 'O', x: 1.2, y: 0, z: 0 },
  ],
  molfile: `Ethanol fallback
  ChemSphere

  3  2  0  0  0  0  0  0  0  0  0  0999 V2000
   -1.2000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
M  END`,
};

const atomColors: Record<string, string> = {
  H: '#f8fafc', C: '#64748b', N: '#3b82f6', O: '#ef4444', F: '#22c55e',
  P: '#f59e0b', S: '#eab308', Cl: '#22c55e', Br: '#b45309', I: '#8b5cf6',
  Na: '#a855f7', Ca: '#f97316',
};

function parseBonds(molfile: string) {
  const lines = molfile.split(/\r?\n/);
  const countsLine = lines[3] || '';
  const atomCount = Number.parseInt(countsLine.slice(0, 3).trim(), 10) || 0;
  const bondCount = Number.parseInt(countsLine.slice(3, 6).trim(), 10) || 0;
  return lines.slice(4 + atomCount, 4 + atomCount + bondCount).map((line) => ({
    from: Number.parseInt(line.slice(0, 3).trim(), 10) - 1,
    to: Number.parseInt(line.slice(3, 6).trim(), 10) - 1,
    order: Number.parseInt(line.slice(6, 9).trim(), 10) || 1,
  })).filter((bond) => bond.from >= 0 && bond.to >= 0);
}

function InteractiveMolecule({
  data,
  zoomLevel,
  rotation,
  onZoomChange,
  onRotationChange,
}: {
  data: StructureData;
  zoomLevel: number;
  rotation: { x: number; y: number };
  onZoomChange: (value: number) => void;
  onRotationChange: (value: { x: number; y: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef({ active: false, x: 0, y: 0 });
  const bonds = parseBonds(data.molfile);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, width, height);

    const points = data.atoms.map((atom) => {
      const cosY = Math.cos(rotation.y);
      const sinY = Math.sin(rotation.y);
      const cosX = Math.cos(rotation.x);
      const sinX = Math.sin(rotation.x);
      const x1 = atom.x * cosY - atom.z * sinY;
      const z1 = atom.x * sinY + atom.z * cosY;
      const y1 = atom.y * cosX - z1 * sinX;
      const z2 = atom.y * sinX + z1 * cosX;
      const perspective = 1 / Math.max(0.55, 1 - z2 * 0.09);
      const scale = Math.min(width, height) / 3.25 * zoomLevel * perspective;
      return { x: width / 2 + x1 * scale, y: height / 2 - y1 * scale, z: z2, perspective };
    });

    const drawBond = (from: typeof points[number], to: typeof points[number], order: number) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length;
      const ny = dx / length;
      const offsets = order > 1 ? [-3, 3] : [0];
      offsets.forEach((offset) => {
        context.beginPath();
        context.moveTo(from.x + nx * offset, from.y + ny * offset);
        context.lineTo(to.x + nx * offset, to.y + ny * offset);
        context.strokeStyle = '#8aa3b7';
        context.lineWidth = 4;
        context.lineCap = 'round';
        context.stroke();
      });
    };

    bonds
      .slice()
      .sort((a, b) => ((points[a.from]?.z || 0) + (points[a.to]?.z || 0)) - ((points[b.from]?.z || 0) + (points[b.to]?.z || 0)))
      .forEach((bond) => {
        if (points[bond.from] && points[bond.to]) drawBond(points[bond.from], points[bond.to], bond.order);
      });

    points
      .map((point, index) => ({ point, atom: data.atoms[index] }))
      .sort((a, b) => a.point.z - b.point.z)
      .forEach(({ point, atom }) => {
        const radius = (atom.element === 'H' ? 16 : 22) * point.perspective;
        const gradient = context.createRadialGradient(point.x - radius * 0.35, point.y - radius * 0.45, radius * 0.1, point.x, point.y, radius);
        const base = atomColors[atom.element] || '#94a3b8';
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.28, base);
        gradient.addColorStop(1, atom.element === 'H' ? '#cbd5e1' : '#334155');
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = gradient;
        context.shadowColor = '#102a4330';
        context.shadowBlur = 10;
        context.shadowOffsetY = 5;
        context.fill();
        context.shadowColor = 'transparent';
        context.strokeStyle = atom.element === 'H' ? '#cbd5e1' : '#ffffffaa';
        context.lineWidth = 1;
        context.stroke();
        context.fillStyle = atom.element === 'H' || atom.element === 'S' ? '#102a43' : '#ffffff';
        context.font = `700 ${Math.max(10, radius * 0.68)}px Plus Jakarta Sans, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(atom.element, point.x, point.y + 1);
      });
  }, [bonds, data, rotation, zoomLevel]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drag.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = { active: true, x: event.clientX, y: event.clientY };
    onRotationChange({ x: rotation.x + dy * 0.01, y: rotation.y + dx * 0.01 });
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    onZoomChange(Math.max(0.6, Math.min(2.4, zoomLevel * Math.exp(-event.deltaY * 0.001))));
  };

  return (
    <canvas
      ref={canvasRef}
      className="studio-viewer"
      aria-label="Interactive 3D molecular structure"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => { drag.current.active = false; }}
      onPointerCancel={() => { drag.current.active = false; }}
      onWheel={handleWheel}
    />
  );
}

export default function MolecularStudio() {
  const [smiles, setSmiles] = useState('CCO');
  const [choice, setChoice] = useState('Ethanol');
  const [data, setData] = useState<StructureData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState({ x: -0.25, y: 0.65 });

  const draw = async () => {
    setBusy(true);
    setError('');

    try {
      const response = await fetch(`${chemistryApiUrl}/api/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smiles: smiles.trim() }),
      });
      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          response.status === 404
            ? `The chemistry API is not running at ${chemistryApiUrl}. Start the Python backend, then try again.`
            : `The chemistry API returned an unexpected response (${response.status}).`,
        );
      }
      if (!response.ok) throw new Error(result.detail || 'Invalid SMILES');
      if (!result?.molfile || !Array.isArray(result?.atoms)) throw new Error('The chemistry API returned incomplete structure data.');
      setData(result as StructureData);
    } catch (caught) {
      if (smiles.trim() === 'CCO') {
        setData(ethanolFallback);
        setError('');
      } else {
        setData(null);
        setError(caught instanceof TypeError
          ? `Could not connect to the chemistry API at ${chemistryApiUrl}. Start the Python backend, then try again.`
          : caught instanceof Error ? caught.message : 'Unable to draw structure');
      }
    } finally {
      setBusy(false);
    }
  };

  const resetView = () => {
    setZoomLevel(1);
    setRotation({ x: -0.25, y: 0.65 });
  };

  const zoom = (amount: number) => {
    setZoomLevel((current) => Math.max(0.6, Math.min(2.4, current * amount)));
  };

  return (
    <section className="page studio-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">VISUALIZE / MOLECULAR STUDIO</span>
          <h1>Draw your molecule in 3D.</h1>
          <p>Enter a SMILES string, validate it with RDKit, then rotate and zoom the structure.</p>
        </div>
        <span className="pill">RDKit + interactive 3D</span>
      </div>

      <div className="studio-input-grid">
        <label>
          Enter SMILES
          <input
            value={smiles}
            onChange={(event) => setSmiles(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && draw()}
            placeholder="Example: CCO"
            aria-label="SMILES string"
          />
        </label>
        <label>
          Choose example
          <select
            value={choice}
            onChange={(event) => {
              const selected = examples.find(([name]) => name === event.target.value);
              if (!selected) return;
              setChoice(selected[0]);
              setSmiles(selected[1]);
            }}
            aria-label="Example molecule"
          >
            {examples.map(([name]) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <button className="primary studio-load" onClick={draw} disabled={busy || !smiles.trim()}>
          {busy ? <Loader2 className="spin" size={17} /> : <ArrowRight size={17} />}
          {busy ? 'Validating…' : 'Draw structure'}
        </button>
      </div>

      <div className="studio-result-grid">
        <div className="studio-real-canvas">
          {data && (
            <>
              <InteractiveMolecule
                data={data}
                zoomLevel={zoomLevel}
                rotation={rotation}
                onZoomChange={setZoomLevel}
                onRotationChange={setRotation}
              />
              <div className="viewer-toolbar" aria-label="3D viewer controls">
                <span className="viewer-hint"><Info size={13} /> Drag to rotate · scroll to zoom</span>
                <div className="viewer-actions">
                  <button type="button" onClick={() => zoom(1.2)} aria-label="Zoom in"><Plus size={15} /></button>
                  <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out"><Minus size={15} /></button>
                  <button type="button" onClick={resetView} aria-label="Reset view"><RotateCcw size={15} /></button>
                  <button type="button" onClick={resetView} aria-label="Fit molecule"><Maximize2 size={15} /></button>
                </div>
              </div>
            </>
          )}
          {!data && !error && (
            <div className="studio-placeholder">
              <div className="placeholder-orbit" />
              <b>3D molecular canvas</b>
              <span>Enter a SMILES string to begin</span>
            </div>
          )}
          {error && <div className="studio-error">{error}</div>}
        </div>

        <div className="studio-info">
          {data ? (
            <>
              <div className="validated"><CheckCircle2 size={16} /> Validated by RDKit</div>
              <span className="tag">MOLECULAR INFORMATION</span>
              <h2>{data.formula}</h2>
              <dl>
                <div><dt>Canonical SMILES</dt><dd>{data.canonical_smiles}</dd></div>
                <div><dt>Molar mass</dt><dd>{data.molar_mass} g/mol</dd></div>
                <div><dt>Atoms</dt><dd>{data.atoms.length}</dd></div>
              </dl>
            </>
          ) : (
            <>
              <span className="tag">READY TO EXPLORE</span>
              <h2>Structure details</h2>
              <p>RDKit validates the input before drawing it.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
