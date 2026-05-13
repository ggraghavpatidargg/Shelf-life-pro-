import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  List, 
  PieChart, 
  Settings, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  User as UserIcon,
  LogOut,
  ChefHat,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { inventoryService, InventoryItem } from './services/inventoryService';
import { recognizeFood, recognizeFoodList, suggestRecipes, suggestAlternatives, repurposeItem, RecognizedFood, RecipeSuggestion, IngredientSubstitute, RepurposeSuggestion } from './services/geminiService';
import { format, isPast, isToday, addDays, differenceInDays } from 'date-fns';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }: any) => {
  const base = "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm tracking-tight transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 uppercase";
  const variants: any = {
    primary: "bg-emerald-600 text-white shadow-md shadow-emerald-200 hover:bg-emerald-700",
    secondary: "bg-white text-emerald-800 border border-emerald-100 hover:bg-emerald-50",
    danger: "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100",
    ghost: "text-slate-400 hover:text-emerald-600 hover:bg-white"
  };
  
  return (
    <button id={`btn-${children?.toString().toLowerCase().replace(/\s/g, '-')}`} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={16} strokeWidth={2.5} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'inventory', icon: List, label: 'Pantry' },
    { id: 'scan', icon: Camera, label: 'Scan' },
    { id: 'recipes', icon: ChefHat, label: 'Recipes' },
    { id: 'stats', icon: PieChart, label: 'Stats' },
    { id: 'profile', icon: UserIcon, label: 'User' },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm bg-white/90 backdrop-blur-xl border border-slate-200 p-2 rounded-full shadow-2xl z-50">
      <div className="flex justify-between items-center px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-full transition-all ${
              activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={20} strokeWidth={2.5} />
            {activeTab === tab.id && (
               <motion.span 
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="text-[9px] font-black uppercase tracking-widest hidden sm:block"
               >
                 {tab.label}
               </motion.span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

// --- Views ---

const LoginView = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[#F4F7F4]">
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }} 
      animate={{ scale: 1, opacity: 1 }}
      className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-emerald-200"
    >
      <Camera className="text-white" size={48} />
    </motion.div>
    <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter italic">ShelfLife<span className="text-emerald-600 not-italic">Pro</span></h1>
    <p className="text-slate-500 mb-12 max-w-xs font-medium leading-relaxed">Vision-first inventory management for a sustainable pantry.</p>
    <Button onClick={signInWithGoogle} variant="primary" className="w-full max-w-xs py-4 shadow-2xl">
      Sign in with Google
    </Button>
  </div>
);

const InventoryView = ({ items, onAction }: { items: InventoryItem[], onAction: () => void }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const getFreshnessStyle = (expiry: Date) => {
    const days = differenceInDays(expiry, new Date());
    if (days < 0) return 'text-rose-600 bg-rose-50 border-rose-100 label-expired'; // Expired
    if (days <= 3) return 'text-amber-600 bg-amber-50 border-amber-100 label-critical'; // Soon
    return 'text-emerald-600 bg-emerald-50 border-emerald-100 label-fresh'; // Fresh
  };

  const activeItems = items.filter(i => i.status === 'fresh');
  const categories = ['All', ...Array.from(new Set(activeItems.map(i => i.category)))];
  
  const filteredItems = activeCategory === 'All' 
    ? activeItems 
    : activeItems.filter(i => i.category === activeCategory);

  const criticalCount = activeItems.filter(i => differenceInDays(i.expiryDate, new Date()) <= 3).length;

  return (
    <div className="pb-32 pt-8 px-6">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
             <Camera className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">ShelfLife <span className="text-emerald-600 font-normal">Pro</span></h1>
        </div>
      </header>

      <div className="flex flex-col gap-6 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Pantry Feed</h2>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 bg-rose-100 text-rose-600 text-[10px] font-black rounded-md">{criticalCount} CRITICAL</span>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-md">{activeItems.length - criticalCount} FRESH</span>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                activeCategory === cat 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                  : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
              {activeCategory === 'All' ? 'Pantry Offline' : `No ${activeCategory} items`}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="flex flex-col h-full gap-4 relative overflow-hidden group">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-100">
                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <span className="text-2xl">📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate text-lg tracking-tight">{item.name}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.category}</p>
                  </div>
                </div>

                <div className={`mt-auto px-3 py-2 rounded-xl border flex justify-between items-center ${getFreshnessStyle(item.expiryDate)}`}>
                   <span className="text-[10px] font-black uppercase tracking-wider">
                     {differenceInDays(item.expiryDate, new Date()) < 0 
                        ? 'Expired' 
                        : `${differenceInDays(item.expiryDate, new Date())} Days Left`}
                   </span>
                   <span className="text-[9px] font-medium opacity-70 italic">{format(item.expiryDate, 'MMM d')}</span>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (item.id) await inventoryService.markAsUsed(item.id);
                      onAction();
                    }}
                    className="p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                   <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (item.id) await inventoryService.markAsWasted(item.id);
                      onAction();
                    }}
                    className="p-2 bg-rose-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const ScanView = ({ onAdded }: { onAdded: () => void }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<RecognizedFood | null>(null);
  const [listResults, setListResults] = useState<RecognizedFood[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [mode, setMode] = useState<'single' | 'list' | 'manual' | 'browse'>('single');
  const [manualItem, setManualItem] = useState<RecognizedFood>({ name: '', category: 'Pantry', estimatedExpiryDays: 7, confidence: 1 });

  const CATALOG_ITEMS = [
    { category: 'Vegetables', icon: '🥕', items: ['Potato', 'Onion', 'Tomato', 'Carrot', 'Cabbage', 'Spinach', 'Ginger', 'Garlic'] },
    { category: 'Spices & Masala', icon: '🌶️', items: ['Turmeric', 'Cumin', 'Salt', 'Black Pepper', 'Chili Powder', 'Garam Masala', 'Hing'] },
    { category: 'Oils & Fats', icon: '🫗', items: ['Sunflower Oil', 'Mustard Oil', 'Ghee', 'Butter', 'Olive Oil'] },
    { category: 'Flours & Grains', icon: '🌾', items: ['Rice', 'Wheat Flour', 'Lentils', 'Poha', 'Maida', 'Besan', 'Sugar'] },
    { category: 'Beverages', icon: '☕', items: ['Tea', 'Coffee', 'Bournvita', 'Horlicks', 'Green Tea'] },
    { category: 'Dairy', icon: '🥛', items: ['Milk', 'Paneer', 'Curd', 'Cheese'] },
  ];

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setImage(reader.result as string);
      
      if (mode === 'single') {
        const food = await recognizeFood(base64);
        setResult(food);
      } else if (mode === 'list') {
        const foods = await recognizeFoodList(base64);
        setListResults(foods);
      }
      setScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSingle = async () => {
    const target = mode === 'manual' ? manualItem : result;
    if (!target || !target.name) return;

    await inventoryService.addItem({
      name: target.name,
      category: target.category,
      purchaseDate: new Date(),
      expiryDate: addDays(new Date(), target.estimatedExpiryDays),
      status: 'fresh',
      imageUrl: image || null
    });
    reset();
    onAdded();
  };

  const handleAddBatch = async () => {
    if (listResults.length === 0) return;
    const items = listResults.map(r => ({
      name: r.name,
      category: r.category,
      purchaseDate: new Date(),
      expiryDate: addDays(new Date(), r.estimatedExpiryDays),
      status: 'fresh' as const,
    }));
    await inventoryService.addItemsBatch(items);
    reset();
    onAdded();
  };

  const reset = () => {
    setResult(null);
    setListResults([]);
    setImage(null);
    setScanning(false);
    setManualItem({ name: '', category: 'Pantry', estimatedExpiryDays: 7, confidence: 1 });
  };

  const updateListItem = (index: number, updates: Partial<RecognizedFood>) => {
    const newList = [...listResults];
    newList[index] = { ...newList[index], ...updates };
    setListResults(newList);
  };

  const removeListItem = (index: number) => {
    setListResults(listResults.filter((_, i) => i !== index));
  };

  const categories = ['Produce', 'Dairy', 'Bakery', 'Meat', 'Pantry', 'Frozen', 'Beverages'];

  return (
    <div className="flex flex-col min-h-screen pb-32 pt-8 px-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter italic">Vision<span className="not-italic text-emerald-600">Scan</span></h2>
        
        {!image && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => { reset(); setMode('single'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'single' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              Single
            </button>
            <button 
              onClick={() => { reset(); setMode('list'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              List
            </button>
            <button 
              onClick={() => { reset(); setMode('manual'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'manual' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              Manual
            </button>
            <button 
              onClick={() => { reset(); setMode('browse'); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'browse' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              Browse
            </button>
          </div>
        )}
      </div>
      
      {!image && mode !== 'manual' && mode !== 'browse' ? (
        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white cursor-pointer hover:bg-emerald-50/20 transition-all hover:border-emerald-200 group">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
            <Camera className="text-emerald-600" size={40} />
          </div>
          <p className="text-slate-800 font-bold tracking-tight text-xl uppercase">
            {mode === 'single' ? 'Capture Item' : 'Capture List'}
          </p>
          <p className="text-slate-400 text-xs mt-3 font-black tracking-[0.2em]">VISION AI POWERED</p>
        </label>
      ) : mode === 'manual' && !image ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="space-y-6">
            <div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 block">Item Name</span>
              <input 
                type="text" 
                placeholder="e.g. Greek Yogurt"
                value={manualItem.name}
                onChange={(e) => setManualItem({...manualItem, name: e.target.value})}
                className="w-full text-xl font-bold text-slate-800 p-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Category</span>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setManualItem({...manualItem, category: cat})}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      manualItem.category === cat 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'bg-white text-slate-400 border border-slate-100 hover:border-emerald-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estimated Life (Days)</span>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                <input 
                  type="range" 
                  min="1" 
                  max="60" 
                  value={manualItem.estimatedExpiryDays}
                  onChange={(e) => setManualItem({...manualItem, estimatedExpiryDays: parseInt(e.target.value)})}
                  className="flex-1 accent-emerald-600"
                />
                <span className="text-lg font-black text-emerald-600 w-12 text-center">{manualItem.estimatedExpiryDays}</span>
              </div>
            </div>

            <Button 
              onClick={handleAddSingle} 
              variant="primary" 
              className="w-full shadow-emerald-200 shadow-xl py-4"
              disabled={!manualItem.name}
            >
              Add to Pantry
            </Button>
          </Card>
        </motion.div>
      ) : mode === 'browse' && !image ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
             <div>
               <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Pantry Catalog</h4>
               <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Select items to add</p>
             </div>
             {listResults.length > 0 && (
               <Button onClick={handleAddBatch} variant="primary" className="py-2 px-4 text-[10px]">Add {listResults.length} Items</Button>
             )}
          </div>

          <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 no-scrollbar pb-10">
            {CATALOG_ITEMS.map((cat, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.category}</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map(itemName => {
                    const isSelected = listResults.some(r => r.name === itemName);
                    return (
                      <button
                        key={itemName}
                        onClick={() => {
                          if (isSelected) {
                            setListResults(listResults.filter(r => r.name !== itemName));
                          } else {
                            // Default expiry based on category
                            let expiry = 30;
                            if (cat.category === 'Vegetables') expiry = 7;
                            if (cat.category === 'Dairy') expiry = 5;
                            if (cat.category === 'Spices & Masala') expiry = 365;

                            setListResults([...listResults, { 
                              name: itemName, 
                              category: cat.category.includes('Spices') ? 'Pantry' : cat.category.includes('Flours') ? 'Pantry' : cat.category, 
                              estimatedExpiryDays: expiry, 
                              confidence: 1 
                            }]);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                          isSelected 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md translate-y-[-2px]' 
                            : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-200'
                        }`}
                      >
                        {itemName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {listResults.length > 0 && (
             <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[calc(100%-6rem)] max-w-sm pointer-events-none">
                <Button 
                  onClick={handleAddBatch} 
                  variant="primary" 
                  className="w-full shadow-2xl pointer-events-auto py-5"
                >
                  Confirm & Store {listResults.length} Items
                </Button>
             </div>
          )}
        </motion.div>
      ) : (
        <div className="space-y-6">
          <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-slate-100 shadow-2xl border-4 border-white">
            <img src={image} className="w-full h-full object-cover" />
            {scanning && (
              <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
                <Loader2 className="animate-spin mb-6" size={48} />
                <p className="font-black tracking-widest uppercase text-xs">AI Processing...</p>
              </div>
            )}
          </div>

          {/* Single Mode Result */}
          {mode === 'single' && result && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Card className="space-y-6 border-emerald-100 bg-emerald-50/30">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1 block">Identification</span>
                    <input 
                      type="text" 
                      value={result.name} 
                      onChange={(e) => setResult({...result, name: e.target.value})}
                      className="text-2xl font-black text-slate-800 tracking-tighter bg-transparent border-none focus:ring-0 p-0 w-full"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</span>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setResult({...result, category: cat})}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                          result.category === cat 
                            ? 'bg-emerald-600 text-white shadow-md' 
                            : 'bg-white text-slate-400 border border-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-white rounded-2xl border border-emerald-100 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estimated Shelf Life</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={result.estimatedExpiryDays} 
                        onChange={(e) => setResult({...result, estimatedExpiryDays: parseInt(e.target.value) || 0})}
                        className="w-12 font-bold text-slate-800 bg-emerald-50 rounded px-1"
                      />
                      <span className="text-sm font-bold text-slate-600">Days</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="text-emerald-600" size={20} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleAddSingle} variant="primary" className="flex-1 shadow-emerald-200 shadow-xl">Approve & Store</Button>
                  <Button onClick={reset} variant="secondary">Discard</Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* List Mode Result */}
          {mode === 'list' && listResults.length > 0 && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                 <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Identified Items ({listResults.length})</h4>
                 <Button onClick={handleAddBatch} variant="primary" className="py-2 px-4 text-[10px]">Add All</Button>
              </div>

              <div className="space-y-3">
                {listResults.map((item, idx) => (
                  <Card key={idx} className="p-4 rounded-3xl group relative">
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <input 
                          value={item.name} 
                          onChange={(e) => updateListItem(idx, { name: e.target.value })}
                          className="font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full"
                        />
                        <div className="flex gap-2 items-center mt-1">
                          <select 
                            value={item.category}
                            onChange={(e) => updateListItem(idx, { category: e.target.value })}
                            className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 border-none rounded px-1 py-0.5 focus:ring-0"
                          >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <span className="text-[9px] text-slate-300 font-bold">|</span>
                          <div className="flex items-center gap-1">
                             <input 
                               type="number" 
                               value={item.estimatedExpiryDays} 
                               onChange={(e) => updateListItem(idx, { estimatedExpiryDays: parseInt(e.target.value) || 0 })}
                               className="w-8 text-[9px] font-black text-slate-600 bg-slate-50 rounded px-1 py-0.5 text-center border-none focus:ring-0"
                             />
                             <span className="text-[9px] font-black text-slate-400 uppercase">Days</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeListItem(idx)}
                        className="p-2 text-rose-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>

              <Button onClick={reset} variant="secondary" className="w-full">Cancel</Button>
            </motion.div>
          )}

          {!scanning && !result && listResults.length === 0 && (
             <Button onClick={reset} variant="secondary" className="w-full">Choose Another Photo</Button>
          )}
        </div>
      )}
    </div>
  );
};

const StatsView = ({ items }: { items: InventoryItem[] }) => {
  const used = items.filter(i => i.status === 'used').length;
  const wasted = items.filter(i => i.status === 'wasted').length;
  const total = used + wasted;
  const wastePercentage = total === 0 ? 0 : Math.round((wasted / total) * 100);
  const efficiency = 100 - wastePercentage;

  return (
    <div className="pb-32 pt-8 px-6 space-y-4">
      <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-4">Analytics</h2>
      
      <div className="grid grid-cols-12 gap-4">
        {/* Waste Score Bento Box */}
        <section className="col-span-12 sm:col-span-7 bg-white rounded-[2.5rem] border border-slate-200 p-8 flex flex-col justify-between shadow-sm min-h-[240px]">
          <div className="flex justify-between items-start">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency Score</h3>
            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">Optimal</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-8xl font-black text-slate-800 leading-none tracking-tighter">{efficiency}</span>
            <span className="text-2xl font-bold text-slate-300 uppercase">/ 100</span>
          </div>
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mt-6">
            <motion.div initial={{ width: 0 }} animate={{ width: `${efficiency}%` }} className="bg-emerald-500 h-full rounded-full" />
          </div>
          <p className="text-sm text-slate-500 font-medium leading-tight mt-4">
            You've utilized {used} items this period. {efficiency > 80 ? "Peak sustainability reached." : "Keep scanning to improve."}
          </p>
        </section>

        {/* Mini Stats Bento Boxes */}
        <div className="col-span-12 sm:col-span-5 grid grid-cols-1 gap-4">
          <section className="bg-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-100 flex flex-col justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-80">Saved</h3>
            <div className="text-4xl font-black">{used}</div>
            <p className="text-[10px] font-medium opacity-70">Items marked as used</p>
          </section>
          <section className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col justify-between">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wasted</h3>
            <div className="text-4xl font-black text-rose-500">{wasted}</div>
             <p className="text-[10px] font-medium text-slate-400">Items expired</p>
          </section>
        </div>

        {/* Category Breakdown Bento Box */}
        <section className="col-span-12 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 p-8">
           <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-8">Category Breakdown</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
             {['Produce', 'Dairy', 'Bakery', 'Meat', 'Pantry'].map(cat => {
               const catItems = items.filter(i => i.category === cat);
               if (catItems.length === 0) return null;
               const catUsed = catItems.filter(i => i.status === 'used').length;
               const catEfficiency = Math.round((catUsed / catItems.length) * 100) || 0;
               return (
                 <div key={cat} className="space-y-3">
                   <div className="flex justify-between items-end">
                      <span className="font-bold text-slate-800 text-sm tracking-tight">{cat}</span>
                      <span className="text-[10px] font-black text-emerald-700">{catItems.length} items</span>
                   </div>
                   <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${catEfficiency}%` }} className="h-full bg-emerald-500" />
                   </div>
                 </div>
               );
             })}
           </div>
        </section>
      </div>
    </div>
  );
};

const RecipesView = ({ pantryItems }: { pantryItems: InventoryItem[] }) => {
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'recipes' | 'substitutes' | 'rescue'>('recipes');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [substitutes, setSubstitutes] = useState<IngredientSubstitute[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  
  const [rescueSearch, setRescueSearch] = useState('');
  const [rescueResults, setRescueResults] = useState<RepurposeSuggestion[]>([]);
  const [rescueLoading, setRescueLoading] = useState(false);

  const generateRecipes = async () => {
    if (pantryItems.length === 0) return;
    setLoading(true);
    const names = pantryItems.filter(i => i.status === 'fresh').map(i => i.name);
    const suggestions = await suggestRecipes(names);
    setRecipes(suggestions);
    setLoading(false);
  };

  const findSubstitutes = async () => {
    if (!subSearch.trim()) return;
    setSubLoading(true);
    const results = await suggestAlternatives(subSearch);
    setSubstitutes(results);
    setSubLoading(false);
  };

  const findRescue = async () => {
    if (!rescueSearch.trim()) return;
    setRescueLoading(true);
    const results = await repurposeItem(rescueSearch);
    setRescueResults(results);
    setRescueLoading(false);
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.title.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    recipe.ingredients.some(ing => ing.toLowerCase().includes(recipeSearch.toLowerCase()))
  );

  useEffect(() => {
    if (mode === 'recipes' && recipes.length === 0 && pantryItems.length > 0) {
      generateRecipes();
    }
  }, [pantryItems, mode]);

  return (
    <div className="pb-32 pt-8 px-6 space-y-6">
      <header className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter italic">AI<span className="not-italic text-emerald-600">Kitchen</span></h2>
          {mode === 'recipes' && (
            <Button 
              onClick={generateRecipes} 
              variant="secondary" 
              disabled={loading}
              className="text-[10px] py-2 px-4"
              icon={loading ? Loader2 : ChevronRight}
            >
              {loading ? 'Thinking...' : 'Refresh'}
            </Button>
          )}
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setMode('recipes')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'recipes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
          >
            Recipe Ideas
          </button>
          <button 
            onClick={() => setMode('substitutes')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'substitutes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
          >
            Substitutes
          </button>
          <button 
            onClick={() => setMode('rescue')}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'rescue' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
          >
            Rescue
          </button>
        </div>
      </header>

      {mode === 'recipes' ? (
        pantryItems.filter(i => i.status === 'fresh').length === 0 ? (
          <Card className="py-20 text-center border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <ChefHat className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Pantry is Empty</p>
            <p className="text-slate-300 text-[10px] mt-2 px-8">Add items to get personalized recipe suggestions.</p>
          </Card>
        ) : loading && recipes.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
             <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center animate-pulse">
                <ChefHat className="text-emerald-300" size={32} />
             </div>
             <p className="font-black text-[10px] uppercase tracking-widest">Consulting the AI Chef...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recipes.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Filter by title or ingredient..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            )}
            {filteredRecipes.map((recipe, idx) => (
              <motion.div
                layout
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="hover:border-emerald-200 transition-all group overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">{recipe.title}</h3>
                      <div className="flex gap-2 mt-1">
                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">{recipe.prepTime}</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <ChefHat size={16} />
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 font-medium mb-4 leading-relaxed line-clamp-2 italic">{recipe.description}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pantry Ingredients Used</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.ingredients.map((ing, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-md text-[9px] font-bold">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Instructions</h4>
                       <ol className="space-y-2">
                         {recipe.instructions.map((step, i) => (
                           <li key={i} className="flex gap-3 text-xs text-slate-600 group">
                             <span className="w-5 h-5 bg-emerald-50 text-emerald-600 font-black rounded flex-shrink-0 flex items-center justify-center text-[9px]">{i+1}</span>
                             <span className="font-medium leading-tight pt-0.5">{step}</span>
                           </li>
                         ))}
                       </ol>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      ) : mode === 'substitutes' ? (
        <div className="space-y-6">
          <Card className="p-4 border-emerald-100 bg-emerald-50/20">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 block">What are you missing?</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. Eggs, Buttermilk, Soy Sauce"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && findSubstitutes()}
                className="flex-1 text-sm font-bold text-slate-800 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <Button 
                onClick={findSubstitutes} 
                disabled={subLoading || !subSearch.trim()} 
                variant="primary" 
                className="w-12 h-12 p-0 flex items-center justify-center shadow-emerald-200 shadow-lg"
              >
                {subLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            {substitutes.map((sub, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="p-4 border-slate-100 flex gap-4 items-start">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                     <span className="font-black text-sm">{idx + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg leading-tight mb-1">{sub.name}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic">{sub.reason}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
            {substitutes.length === 0 && !subLoading && (
              <div className="py-20 text-center opacity-40">
                 <ChefHat className="mx-auto mb-4" size={32} />
                 <p className="text-[10px] font-black uppercase tracking-widest">Search for a substitute</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 border-amber-100 bg-amber-50/20">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 block">Dish Rescue & Repurpose</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. Failed mava chakki, over-salted soup"
                value={rescueSearch}
                onChange={(e) => setRescueSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && findRescue()}
                className="flex-1 text-sm font-bold text-slate-800 p-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <Button 
                onClick={findRescue} 
                disabled={rescueLoading || !rescueSearch.trim()} 
                variant="primary" 
                className="w-12 h-12 p-0 flex items-center justify-center shadow-amber-200 shadow-lg !bg-amber-600 border-amber-600"
              >
                {rescueLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            {rescueResults.map((res, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="p-5 border-amber-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-800 text-lg leading-tight">{res.title}</h4>
                    <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Rescue Plan</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic border-l-2 border-amber-200 pl-3">
                      <span className="font-black text-[9px] uppercase block mb-1">The Fix</span>
                      {res.fix}
                    </p>
                    <div className="bg-amber-50/50 p-2 rounded-lg">
                      <span className="font-black text-[8px] text-amber-600 uppercase block mb-1">New Dish</span>
                      <p className="text-sm font-bold text-slate-700">{res.newDish}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
            {rescueResults.length === 0 && !rescueLoading && (
              <div className="py-20 text-center opacity-40">
                 <ChefHat className="mx-auto mb-4 text-amber-300" size={32} />
                 <p className="text-[10px] font-black uppercase tracking-widest">Describe your cooking mishap</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileView = ({ user }: { user: User }) => {
  return (
    <div className="pb-32 pt-8 px-6 flex flex-col min-h-screen">
      <div className="flex flex-col items-center py-12">
        <div className="w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-2xl rotate-3">
          <div className="w-full h-full rounded-[2rem] overflow-hidden bg-emerald-100 border-2 border-emerald-50 flex items-center justify-center">
            {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <UserIcon size={48} className="text-emerald-400" />}
          </div>
        </div>
        <div className="text-center mt-8 space-y-1">
          <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{user.displayName || 'Sustainability Member'}</h3>
          <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">{user.email}</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <section className="bg-white rounded-[2rem] border border-slate-200 p-6 flex items-center justify-between group cursor-pointer hover:bg-emerald-50/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Settings size={20} className="text-slate-400" />
            </div>
            <span className="font-bold text-slate-800">Advanced Settings</span>
          </div>
          <ChevronRight size={20} className="text-slate-300" />
        </section>

        <section className="bg-white rounded-[2rem] border border-slate-200 p-6 flex items-center justify-between group cursor-pointer hover:bg-rose-50/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Trash2 size={20} className="text-rose-400" />
            </div>
            <span className="font-bold text-slate-800">Clear Analytics</span>
          </div>
          <ChevronRight size={20} className="text-slate-300" />
        </section>
      </div>

      <Button onClick={() => signOut(auth)} variant="danger" className="w-full mt-12 py-5 shadow-xl shadow-rose-100" icon={LogOut}>
        Terminate Session
      </Button>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        requestNotificationPermission();
      }
    });
    return () => unsubscribe();
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
    }
  };

  const checkExpiringItems = (itemsList: InventoryItem[]) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    itemsList.forEach(item => {
      if (item.status === 'fresh') {
        const daysToExpiry = differenceInDays(item.expiryDate, new Date());
        if (daysToExpiry >= 0 && daysToExpiry <= 3) {
          // Use a key in localStorage to avoid duplicate notifications in the same session
          const notificationKey = `sent_notify_${item.id}`;
          if (!localStorage.getItem(notificationKey)) {
            new Notification('ShelfLife Expiry Alert', {
              body: `${item.name} is expiring soon (on ${format(item.expiryDate, 'MMM d')})!`,
              icon: '/icon-192x192.png' // Fallback icon path
            });
            localStorage.setItem(notificationKey, 'true');
          }
        }
      }
    });
  };

  const refreshItems = async () => {
    if (user) {
      const data = await inventoryService.getItems();
      setItems(data);
      checkExpiringItems(data);
    }
  };

  useEffect(() => {
    if (user) refreshItems();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50/20">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (!user) return <LoginView />;

  return (
    <div className="min-h-screen bg-[#F4F7F4] font-sans selection:bg-emerald-100 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto bg-white min-h-screen sm:min-h-0 sm:rounded-[3rem] shadow-2xl relative overflow-x-hidden border-slate-200 sm:border">
        
        {/* Page Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="h-full"
          >
            {activeTab === 'inventory' && <InventoryView items={items} onAction={refreshItems} />}
            {activeTab === 'scan' && <ScanView onAdded={() => { setActiveTab('inventory'); refreshItems(); }} />}
            {activeTab === 'recipes' && <RecipesView pantryItems={items} />}
            {activeTab === 'stats' && <StatsView items={items} />}
            {activeTab === 'profile' && <ProfileView user={user} />}
          </motion.div>
        </AnimatePresence>

        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}
