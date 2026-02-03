import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <--- NEW IMPORT
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Plus, Trash2, Play, Pause, Package, Upload, FileUp,
  SkipBack, SkipForward, ChevronLeft, ChevronRight, Scale, ShieldAlert, ShieldCheck, Fingerprint,
  Hand // <--- NEW ICON
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

// --- TYPES ---
interface PackedItem {
  id: string;
  position: [number, number, number];
  dimensions: [number, number, number];
  weight?: number;
  fragile?: boolean;
}

interface ItemInput {
  id: string;
  width: number;
  height: number;
  depth: number;
  weight: number;
  fragile: boolean;
}

const COLORS = [
  '#00d4ff', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899',
  '#06b6d4', '#a855f7', '#22c55e', '#eab308', '#f43f5e'
];

/* -------------------- 3D BOX COMPONENT -------------------- */
function PackedBox({ position, dimensions, id, color, hovered, onHover, onClick, weight, fragile }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  const [w, h, d] = dimensions;
  const [x, y, z] = position;

  useFrame(() => {
    if (mesh.current) {
      mesh.current.scale.setScalar(hovered ? 1.03 : 1);
    }
  });

  return (
    <group position={[x + w / 2, y + h / 2, z + d / 2]}>
      <mesh
        ref={mesh}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); }}
        onPointerOut={() => { onHover(false); }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
            color={fragile ? '#ff6b6b' : color}
            transparent
            opacity={0.85}
            emissive={fragile ? '#ff0000' : '#000000'}
            emissiveIntensity={fragile ? 0.2 : 0}
        />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color={hovered ? '#ffffff' : 'rgba(0,0,0,0.3)'} />
      </lineSegments>

      {/* --- LARGE ID TOOLTIP --- */}
      {hovered && (
        <Html distanceFactor={8} zIndexRange={[100, 0]}>
          <div className="glass-panel p-3 min-w-[160px] pointer-events-none select-none z-50 shadow-2xl border border-white/30 bg-black/90 text-white rounded-lg transform -translate-y-8">
            <div className="flex items-center gap-2 mb-2 border-b border-white/20 pb-2">
                <Fingerprint className="w-5 h-5 text-primary" />
                <span className="font-mono font-bold text-primary text-xl tracking-tight truncate max-w-[150px]">{id}</span>
                {fragile && <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse ml-auto flex-shrink-0" />}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs opacity-90 font-mono">
                <span className="text-muted-foreground">Dim:</span> <span>{w} × {h} × {d}</span>
                <span className="text-muted-foreground">Pos:</span> <span>[{x}, {y}, {z}]</span>
                {weight > 0 && (
                    <>
                        <span className="text-muted-foreground">Wt:</span>
                        <span className="text-yellow-400 font-bold">{weight}kg</span>
                    </>
                )}
                {fragile && (
                    <span className="col-span-2 text-red-400 font-bold text-center mt-2 border-t border-white/10 pt-1 tracking-widest uppercase text-[10px]">
                        FRAGILE CONTENT
                    </span>
                )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/* -------------------- BIN WIREFRAME -------------------- */
function BinWireframe({ dims }: { dims: [number, number, number] }) {
  const [w, h, d] = dims;
  const edges: [number, number, number][] = [
    [0, 0, 0], [w, 0, 0], [w, 0, 0], [w, 0, d], [w, 0, d], [0, 0, d], [0, 0, d], [0, 0, 0],
    [0, h, 0], [w, h, 0], [w, h, 0], [w, h, d], [w, h, d], [0, h, d], [0, h, d], [0, h, 0],
    [0, 0, 0], [0, h, 0], [w, 0, 0], [w, h, 0], [w, 0, d], [w, h, d], [0, 0, d], [0, h, d],
  ];

  return (
    <>
      <mesh position={[w/2, h/2, d/2]}>
        <boxGeometry args={[w,h,d]} />
        <meshStandardMaterial transparent opacity={0.03} color="#000" depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <Line key={i} points={[edges[i*2], edges[i*2+1]]} color="#00d4ff" lineWidth={1.5} opacity={0.4} transparent />
      ))}
    </>
  );
}

/* -------------------- MAIN WORKSPACE -------------------- */
export default function Workspace() {
  const navigate = useNavigate(); // <--- INITIALIZE NAVIGATION
  const [binWidth, setBinWidth] = useState(10);
  const [binHeight, setBinHeight] = useState(10);
  const [binDepth, setBinDepth] = useState(10);

  const [items, setItems] = useState<ItemInput[]>([
    { id: 'BOX-001', width: 3, height: 4, depth: 2, weight: 1.5, fragile: false },
    { id: 'BOX-002', width: 2, height: 2, depth: 2, weight: 0.5, fragile: true },
  ]);

  const [packedItems, setPackedItems] = useState<PackedItem[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < packedItems.length) return prev + 1;
          else { setIsPlaying(false); return prev; }
        });
      }, 600);
    }
    return () => clearInterval(interval);
  }, [isPlaying, packedItems.length]);

  const addItem = () =>
    setItems([...items, { id: `Item-${Date.now().toString().slice(-4)}`, width: 2, height: 2, depth: 2, weight: 0, fragile: false }]);

  const updateItem = (id: string, key: keyof ItemInput, val: any) =>
    setItems(items.map(i => i.id === id ? { ...i, [key]: val } : i));

  // --- CSV PARSER ---
  const handleCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => header.toLowerCase().replace(/[^a-z0-9]/g, "").trim(),
      complete: (results: any) => {
        const newItems: ItemInput[] = [];
        results.data.forEach((row: any) => {
          const h = row.height || row.h || 0;
          let w = row.width || row.w || 0;
          let d = row.depth || row.d || row.deep || 0;
          const weight = row.weight || row.wt || row.mass || row.kg || 0;
          let fragile = row.fragile || row.fragility || false;

          if (typeof fragile === 'string') {
              const lower = fragile.toLowerCase();
              fragile = (lower === 'yes' || lower === 'true' || lower === 'y' || lower === '1');
          } else {
              fragile = Boolean(fragile);
          }

          if (!d && (row.length || row.l || row.len)) d = row.length || row.l || row.len;
          if (!w && d && (row.length || row.l)) w = row.length || row.l;

          const customId = row.id || row.sku || row.label || row.name || `CSV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

          if (Number(w) > 0 && Number(h) > 0 && Number(d) > 0) {
            newItems.push({
              id: String(customId),
              width: Number(w),
              height: Number(h),
              depth: Number(d),
              weight: Number(weight),
              fragile: fragile
            });
          }
        });

        if (newItems.length > 0) {
          setItems(prev => [...prev, ...newItems]);
          toast.success(`Imported ${newItems.length} items`);
        } else {
          toast.error("No valid items found.");
        }
      },
      error: () => toast.error("Failed to parse CSV file")
    });
  };

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith('.csv'))) handleCSV(file);
    else toast.error("Please drop a valid CSV file");
  }, []);

  const generatePacking = async () => {
    setLoading(true);
    setIsPlaying(false);
    try {
      const res = await fetch('http://localhost:8000/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bin: [binWidth, binHeight, binDepth],
          items: items.map(i => [
              i.width,
              i.height,
              i.depth,
              i.weight,
              i.fragile ? 1 : 0,
              i.id
          ])
        })
      });

      if (!res.ok) throw new Error("Server Error");

      const data = await res.json();
      setPackedItems(data.packed_items);
      setCurrentStep(data.packed_items.length);
      toast.success("Packing generated!");
    } catch (e) {
      console.error(e);
      setPackedItems([]);
      setCurrentStep(0);
      toast.error("Failed to connect to backend. Ensure server.py is running.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex pt-16 h-screen overflow-hidden">
        {/* -------- LEFT PANEL -------- */}
        <aside className="w-80 p-4 flex flex-col h-full border-r border-border/50 bg-background/50 backdrop-blur-sm z-10">
          <div className="glass-panel p-4 flex flex-col h-full gap-4">

            {/* Bin Settings */}
            <div className="flex-shrink-0">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-primary" /> Bin Dimensions
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Width', binWidth, setBinWidth],
                  ['Height', binHeight, setBinHeight],
                  ['Depth', binDepth, setBinDepth],
                ].map(([label, value, setter]: any) => (
                  <div key={label}>
                    <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
                    <Input
                      type="number"
                      value={value === 0 ? '' : value}
                      onChange={(e) => setter(e.target.value === '' ? 0 : Number(e.target.value))}
                      min={1}
                      className="h-8 text-sm mt-0.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-border/50 flex-shrink-0" />

            {/* Items List */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h2 className="font-semibold text-sm">Items ({items.length})</h2>
                <div className="flex gap-1">
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleCSV(e.target.files[0])} accept=".csv" className="hidden" />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={addItem}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>

              <div
                className={`flex-1 overflow-y-auto rounded-md transition-all duration-200 border-2 ${isDragging ? "border-primary bg-primary/5 border-dashed" : "border-transparent"}`}
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              >
                {items.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center select-none">
                    <FileUp className="w-8 h-8 mb-3 opacity-30" />
                    <p className="text-xs">Drag & Drop CSV here</p>
                  </div>
                )}

                <div className="space-y-3 p-1">
                  <AnimatePresence>
                    {items.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-2 p-2 rounded border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors group relative"
                      >
                        <Button
                            size="icon" variant="ghost"
                            className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-muted-foreground hover:text-destructive"
                            onClick={() => setItems(items.filter(x => x.id !== item.id))}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>

                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <div className="text-[10px] font-mono text-muted-foreground w-16 truncate font-bold text-primary/80" title={item.id}>
                                {item.id}
                            </div>
                            <div className="grid grid-cols-3 gap-1 flex-1">
                            {(['width','height','depth'] as const).map(k => (
                                <Input
                                key={k} type="number" placeholder={k[0].toUpperCase()}
                                value={item[k] || ''} onChange={(e) => updateItem(item.id, k, Number(e.target.value))}
                                className="h-7 text-xs px-1 text-center" min={0.1}
                                />
                            ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pl-4">
                            <div className="relative flex-1">
                                <Scale className="absolute left-1.5 top-2 w-3 h-3 text-muted-foreground" />
                                <Input
                                    type="number" placeholder="Wt"
                                    value={item.weight || ''}
                                    onChange={(e) => updateItem(item.id, 'weight', Number(e.target.value))}
                                    className="h-7 text-xs pl-6 pr-6 text-center"
                                />
                                <span className="absolute right-2 top-2 text-[8px] text-muted-foreground">kg</span>
                            </div>

                            <Button
                                variant={item.fragile ? "destructive" : "outline"}
                                size="sm"
                                className={`h-7 px-2 text-[10px] gap-1 transition-all ${!item.fragile && "text-muted-foreground hover:text-foreground"}`}
                                onClick={() => updateItem(item.id, 'fragile', !item.fragile)}
                            >
                                {item.fragile ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3 opacity-50" />}
                                {item.fragile ? "Fragile" : "Safe"}
                            </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* --- ACTION BUTTONS --- */}
            <div className="flex gap-2 w-full flex-shrink-0">
                <Button
                  variant="default"
                  className="flex-1 shadow-lg shadow-primary/20"
                  onClick={generatePacking}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
                  Generate Packing
                </Button>

                {/* --- HAND EDIT BUTTON --- */}
                <Button
                  variant="outline"
                  size="icon"
                  className="w-12 border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => navigate('/edit')}
                  title="Edit with Hands"
                  disabled={loading || packedItems.length === 0}
                >
                   <Hand className="w-5 h-5" />
                </Button>
            </div>
          </div>
        </aside>

        {/* -------- 3D VIEW -------- */}
        <div className="flex-1 relative bg-gradient-to-b from-background to-muted/20 overflow-hidden">
          <Canvas>
            <PerspectiveCamera makeDefault position={[25, 25, 35]} fov={50} />
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 20, 10]} intensity={0.8} />
            <pointLight position={[-10, 10, -10]} intensity={0.5} />
            <OrbitControls makeDefault minDistance={10} maxDistance={100} />

            <group position={[-binWidth/2, -binHeight/2, -binDepth/2]}>
              <BinWireframe dims={[binWidth, binHeight, binDepth]} />

              {packedItems.slice(0, currentStep).map((item, i) => (
                <PackedBox
                  key={i}
                  {...item}
                  color={COLORS[i % COLORS.length]}
                  hovered={hovered === item.id}
                  onHover={(v: boolean) => setHovered(v ? item.id : null)}
                />
              ))}
            </group>

            <gridHelper args={[100, 100, 0x222222, 0x111111]} position={[0, -binHeight/2 - 0.1, 0]} />
          </Canvas>

          {/* --- REPLAY CONTROLS --- */}
          {packedItems.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg">
              <div className="glass-panel p-3 flex flex-col gap-2 animate-in slide-in-from-bottom-5">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">0</span>
                  <input
                    type="range" min={0} max={packedItems.length} value={currentStep}
                    onChange={(e) => { setCurrentStep(Number(e.target.value)); setIsPlaying(false); }}
                    className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground w-8">{packedItems.length}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentStep(0); setIsPlaying(false); }}><SkipBack className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentStep(p => Math.max(0, p - 1)); setIsPlaying(false); }}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant={isPlaying ? "secondary" : "default"} size="icon" className="h-10 w-10 rounded-full shadow-md" onClick={() => { if (currentStep === packedItems.length) setCurrentStep(0); setIsPlaying(!isPlaying); }}>
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentStep(p => Math.min(packedItems.length, p + 1)); setIsPlaying(false); }}><ChevronRight className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentStep(packedItems.length); setIsPlaying(false); }}><SkipForward className="w-4 h-4" /></Button>
                </div>
                <div className="text-center text-[10px] text-muted-foreground">
                  {currentStep === 0 ? "Ready to pack" : currentStep === packedItems.length ? "Packing Complete" : `Packing item ${currentStep} of ${packedItems.length}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}